import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { decodeEmailFromOrderId, packIdFromOrderId } from "@/lib/order-id";
import { findPack } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NOWPayments IPN webhook.
 *
 * Verifies x-nowpayments-sig as HMAC-SHA512 over the canonically-sorted JSON.
 * On valid payment, extracts the customer email from order_id, calls the
 * internal API to create customer + credit account + API key, then dispatches
 * the API key email.
 */

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortObject((value as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return value;
}

function timingSafeEqualHex(left: string, right: string) {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}



export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-nowpayments-sig");
  const secret = process.env.NOWPAYMENTS_IPN_SECRET?.trim();

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid JSON IPN payload." },
      { status: 400 }
    );
  }

  if (!secret) {
    console.warn("[TRIANGULATE_NOWPAYMENTS_IPN] NOWPAYMENTS_IPN_SECRET missing — refusing to mark paid.");
    return NextResponse.json(
      { error: "missing_env", message: "NOWPAYMENTS_IPN_SECRET not configured." },
      { status: 503 }
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: "unauthorized", message: "Missing x-nowpayments-sig header." },
      { status: 401 }
    );
  }

  const sortedJson = JSON.stringify(sortObject(payload));
  const expected = crypto.createHmac("sha512", secret).update(sortedJson).digest("hex");
  const verified = timingSafeEqualHex(expected, signature);

  if (!verified) {
    console.warn("[TRIANGULATE_NOWPAYMENTS_IPN] signature mismatch");
    return NextResponse.json(
      { error: "unauthorized", message: "IPN signature verification failed." },
      { status: 401 }
    );
  }

  const status = String(payload.payment_status ?? "");
  const orderId = String(payload.order_id ?? "");
  const paid = status === "finished" || status === "confirmed";

  console.log("[TRIANGULATE_NOWPAYMENTS_IPN] verified event", {
    orderId,
    paymentStatus: status,
    paid
  });

  if (!paid) {
    return NextResponse.json({ ok: true, verified: true, paid: false, orderId, status });
  }

  // ── Payment confirmed: create customer + credit account + API key ──
  const email = decodeEmailFromOrderId(orderId);
  const packId = packIdFromOrderId(orderId);
  const pack = packId ? findPack(packId) : undefined;

  if (!email) {
    console.error("[TRIANGULATE_NOWPAYMENTS_IPN] Could not decode email from order_id:", orderId);
    return NextResponse.json(
      { error: "bad_order", message: "Could not decode email from order_id." },
      { status: 400 }
    );
  }

  if (!pack) {
    console.error("[TRIANGULATE_NOWPAYMENTS_IPN] Unknown pack in order_id:", orderId);
    return NextResponse.json(
      { error: "unknown_pack", message: "Unknown credit pack in order_id." },
      { status: 400 }
    );
  }

  // Call the internal API to create customer + credits + API key
  const apiBase = process.env.API_INTERNAL_URL?.trim() ?? "http://api:8080";
  let apiKey: string | null = null;

  try {
    const ipnResponse = await fetch(`${apiBase}/v1/internal/ipn`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId,
        packId: pack.id,
        email,
        paymentStatus: status,
        payCurrency: String(payload.pay_currency ?? ""),
        payAmount: Number(payload.pay_amount ?? 0),
        priceUsd: pack.priceUsd,
        credits: pack.credits
      })
    });

    const ipnData = await ipnResponse.json() as Record<string, unknown>;
    apiKey = ipnData.apiKey as string | null;

    if (!ipnResponse.ok) {
      console.error("[TRIANGULATE_NOWPAYMENTS_IPN] Internal API error:", ipnData);
      return NextResponse.json(
        {
          error: "internal_api_error",
          message: "Failed to create customer record.",
          detail: ipnData
        },
        { status: 502 }
      );
    }

    console.log("[TRIANGULATE_NOWPAYMENTS_IPN] Customer created, credits granted", {
      orderId,
      email,
      packId: pack.id,
      credits: pack.credits
    });
  } catch (err) {
    console.error("[TRIANGULATE_NOWPAYMENTS_IPN] Failed to reach internal API:", err);
    return NextResponse.json(
      {
        error: "internal_api_unreachable",
        message: "Could not reach the API service to create customer."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    verified: true,
    paid: true,
    orderId,
    status,
    email,
    creditsGranted: pack.credits,
    apiKeyDelivered: !!apiKey
  });
}
