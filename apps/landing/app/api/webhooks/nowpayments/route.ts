import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NOWPayments IPN webhook.
 *
 * Verifies x-nowpayments-sig as HMAC-SHA512 over the canonically-sorted JSON.
 * Reference: https://documenter.getpostman.com/view/7907941/2s93JusNJt
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

  // Wave 2: log + ACK. Wave 3 persists into the credit ledger and triggers
  // the API-key delivery email.
  console.log("[TRIANGULATE_NOWPAYMENTS_IPN] verified event", {
    orderId,
    paymentStatus: status,
    paid,
    payCurrency: payload.pay_currency,
    actuallyPaidUsd: payload.actually_paid_at_fiat,
    payAmount: payload.pay_amount
  });

  return NextResponse.json({ ok: true, verified: true, paid, orderId, status });
}
