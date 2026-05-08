import { NextResponse } from "next/server";
import { findPack } from "@/lib/pricing";
import { encodeOrderId } from "@/lib/order-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { packId?: string; email?: string };

function appUrl(req: Request) {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const pack = body.packId ? findPack(body.packId) : undefined;
  if (!pack) {
    return NextResponse.json(
      { error: "unknown_pack", message: "Unknown credit pack id. Expected: starter, team, or scale." },
      { status: 400 }
    );
  }

  // Require email for credit issuance
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "missing_email", message: "An email address is required to receive your API key after payment." },
      { status: 400 }
    );
  }

  const apiKey = process.env.NOWPAYMENTS_API_KEY?.trim();
  const base = appUrl(req);
  const id = encodeOrderId(pack.id, email);

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "missing_env",
        message: "NOWPAYMENTS_API_KEY is not configured. Set it on the deploy target to enable hosted checkout.",
        orderId: id,
        pack: { id: pack.id, credits: pack.credits, priceUsd: pack.priceUsd }
      },
      { status: 503 }
    );
  }

  const upstream = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      price_amount: pack.priceUsd,
      price_currency: "usd",
      order_id: id,
      order_description: `Triangulate ${pack.name} pack — ${pack.credits.toLocaleString()} enrichment credits`,
      ipn_callback_url: `${base}/api/webhooks/nowpayments`,
      success_url: `${base}/?checkout=success&order=${encodeURIComponent(id)}`,
      cancel_url: `${base}/?checkout=cancelled&order=${encodeURIComponent(id)}`,
      is_fee_paid_by_user: false
    })
  });

  const text = await upstream.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = { raw: text };
  }

  if (!upstream.ok) {
    console.error("[TRIANGULATE_NOWPAYMENTS_ERROR]", upstream.status, text.slice(0, 500));
    return NextResponse.json(
      {
        error: "upstream_error",
        message: `NOWPayments returned HTTP ${upstream.status}.`,
        orderId: id
      },
      { status: 502 }
    );
  }

  const invoiceUrl = String(data.invoice_url ?? data.payment_url ?? "");
  return NextResponse.json({
    ok: true,
    orderId: id,
    invoiceUrl,
    invoiceId: String(data.id ?? ""),
    pack: { id: pack.id, credits: pack.credits, priceUsd: pack.priceUsd }
  });
}
