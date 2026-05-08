/**
 * Order ID encoding/decoding for NOWPayments checkout flow.
 *
 * The customer email is base64url-encoded into the order_id so the IPN
 * handler can retrieve it without a separate DB lookup.
 *
 * Format: triangulate_{packId}_{b64Email}_{ts}_{rnd}
 * Max order_id length is 255 chars (NOWPayments limit).
 */

/**
 * Encode the customer email into an order_id.
 */
export function encodeOrderId(packId: string, email: string): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  const b64Email = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `triangulate_${packId}_${b64Email}_${ts}_${rnd}`;
}

/**
 * Decode customer email from the order_id.
 */
export function decodeEmailFromOrderId(orderId: string): string | null {
  const parts = orderId.split("_");
  // triangulate_packId_b64email_ts_rnd
  if (parts.length < 4) return null;
  try {
    return Buffer.from(parts[2], "base64url").toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Extract packId from order_id.
 */
export function packIdFromOrderId(orderId: string): string | null {
  const parts = orderId.split("_");
  if (parts.length < 4) return null;
  return parts[1] ?? null;
}
