/**
 * Webhook dispatch with HMAC-SHA512 signing and exponential backoff retry.
 *
 * Phase 3: POST /v1/enrich fires these to customer webhookUrl after enrichment.
 * Phase 4: Batch completion webhooks reuse this same dispatch.
 */
import { createHmac } from "node:crypto";

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1_000, 5_000, 25_000]; // 1s, 5s, 25s exponential

export interface DispatchOpts {
  /** Customer webhook URL to POST to. */
  url: string;
  /** Payload to send as JSON body. */
  payload: Record<string, unknown>;
  /** Shared secret for HMAC-SHA512 signing (the customer's API key). */
  secret: string;
  /** Correlation ID for tracing. */
  correlationId: string;
}

export interface DispatchResult {
  ok: boolean;
  attempts: number;
  lastStatus?: number;
  lastError?: string;
}

/**
 * POST the enrichment result to the customer's webhook URL with HMAC-SHA512
 * signature in x-triangulate-signature. Retries up to 3 times with exponential
 * backoff. Fire-and-forget — the caller should not await this in the hot path.
 */
export async function dispatchWebhook(opts: DispatchOpts): Promise<DispatchResult> {
  const body = JSON.stringify(opts.payload);
  const signature = sign(opts.secret, body);

  let lastError: string | undefined;
  let lastStatus: number | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000); // 10s per attempt

      const res = await fetch(opts.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-triangulate-signature": signature,
          "x-triangulate-correlation-id": opts.correlationId,
          "user-agent": "Triangulate-Webhook/1.0"
        },
        body,
        signal: controller.signal
      });

      clearTimeout(timeout);
      lastStatus = res.status;

      if (res.ok) {
        return { ok: true, attempts: attempt, lastStatus };
      }

      // 4xx errors (except 429) are permanent — don't retry
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { ok: false, attempts: attempt, lastStatus, lastError: `HTTP ${res.status}` };
      }

      // 5xx or 429: retry if we have attempts left
      lastError = `HTTP ${res.status}`;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (attempt < MAX_ATTEMPTS) {
      const delay = RETRY_DELAYS_MS[attempt - 1] ?? 25_000;
      await sleep(delay);
    }
  }

  return { ok: false, attempts: MAX_ATTEMPTS, lastStatus, lastError };
}

/**
 * Create HMAC-SHA512 signature of the request body using the API key as secret.
 */
function sign(secret: string, body: string): string {
  return createHmac("sha512", secret).update(body).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
