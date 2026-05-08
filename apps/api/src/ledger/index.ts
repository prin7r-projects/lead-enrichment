/**
 * Credit ledger operations: consume credits, grant credits, get balance, get usage.
 *
 * All credit mutations happen in DB transactions to prevent double-spend.
 * The consumer in POST /v1/enrich is the primary credit-sink.
 */
import { sql } from "../db/client.js";
import type { AuthContext } from "../auth/index.js";

export interface CreditAccount {
  id: string;
  customerId: string;
  balance: number;
  lifetimeUsed: number;
  tier: string;
  status: string;
}

export interface CreditTransaction {
  id: string;
  accountId: string;
  type: "consume" | "purchase" | "refund" | "admin_grant" | "admin_revoke";
  amount: number;
  balanceAfter: number;
  enrichmentId: string | null;
  paymentId: string | null;
  correlationId: string | null;
  createdAt: Date;
}

export interface CreditUsage {
  balance: number;
  lifetimeConsumed: number;
  tier: string;
  purchases: Array<{
    packId: string;
    credits: number;
    priceUsd: number;
    purchasedAt: string;
  }>;
  recentUsage: Array<{
    correlationId: string;
    inputHash: string;
    inputDomain: string;
    consumedAt: string;
    cached: boolean;
  }>;
}

/**
 * Get the full credit usage for an account — returned by GET /v1/credits.
 */
export async function getCreditUsage(auth: AuthContext): Promise<CreditUsage> {
  const [acct] = await sql`
    SELECT balance, lifetime_used, tier
    FROM credit_accounts
    WHERE id = ${auth.accountId} AND status = 'active'
  `;

  if (!acct) {
    return {
      balance: 0,
      lifetimeConsumed: 0,
      tier: "starter",
      purchases: [],
      recentUsage: []
    };
  }

  const purchases = await sql`
    SELECT pack_id, credits, price_usd, completed_at
    FROM payments
    WHERE customer_id = ${auth.customerId}
      AND payment_status IN ('finished', 'confirmed')
    ORDER BY completed_at DESC
    LIMIT 20
  `;

  const recent = await sql`
    SELECT correlation_id, input_hash, input_domain, cached, credit_consumed, created_at
    FROM enrichment_requests
    WHERE account_id = ${auth.accountId}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  return {
    balance: acct.balance as number,
    lifetimeConsumed: acct.lifetimeUsed as number,
    tier: acct.tier as string,
    purchases: purchases.map(p => ({
      packId: p.packId as string,
      credits: p.credits as number,
      priceUsd: Number(p.priceUsd),
      purchasedAt: (p.completedAt as Date).toISOString()
    })),
    recentUsage: recent.map(r => ({
      correlationId: r.correlationId as string,
      inputHash: r.inputHash as string,
      inputDomain: r.inputDomain as string,
      consumedAt: (r.createdAt as Date).toISOString(),
      cached: r.cached as boolean
    }))
  };
}

/**
 * Consume a single credit for an enrichment request.
 * Returns true if a credit was consumed, false if balance was insufficient.
 */
export async function consumeCredit(params: {
  accountId: string;
  apiKeyId: string;
  correlationId: string;
  inputHash: string;
  inputDomain: string;
  responseShape: string;
  latencyMs: number;
}): Promise<{ consumed: boolean; balanceAfter: number }> {
  const result = await sql.begin(async tx => {
    // Lock the account row to prevent double-spend
    const [acct] = await tx`
      SELECT balance, lifetime_used FROM credit_accounts
      WHERE id = ${params.accountId} AND status = 'active'
      FOR UPDATE
    `;

    if (!acct || (acct.balance as number) < 1) {
      return { consumed: false, balanceAfter: acct ? (acct.balance as number) : 0 };
    }

    const newBalance = (acct.balance as number) - 1;
    const newLifetime = (acct.lifetimeUsed as number) + 1;

    await tx`
      UPDATE credit_accounts
      SET balance = ${newBalance}, lifetime_used = ${newLifetime}, updated_at = now()
      WHERE id = ${params.accountId}
    `;

    await tx`
      INSERT INTO credit_transactions (account_id, type, amount, balance_after, correlation_id)
      VALUES (${params.accountId}, 'consume', -1, ${newBalance}, ${params.correlationId})
    `;

    return { consumed: true, balanceAfter: newBalance };
  });

  // Log the enrichment request (outside the credit transaction to avoid rollback of the log)
  if (result.consumed) {
    await sql`
      INSERT INTO enrichment_requests
        (account_id, api_key_id, correlation_id, input_hash, input_domain, cached, credit_consumed, response_shape, latency_ms)
      VALUES
        (${params.accountId}, ${params.apiKeyId}, ${params.correlationId},
         ${params.inputHash}, ${params.inputDomain}, false, true, ${params.responseShape}, ${params.latencyMs})
    `.catch(err => console.error("[LEDGER] Failed to log enrichment request:", err));
  }

  return result;
}

/**
 * Log a cache hit — no credit consumed but we still log the request.
 */
export async function logCacheHit(params: {
  accountId: string;
  apiKeyId: string;
  correlationId: string;
  inputHash: string;
  inputDomain: string;
  responseShape: string;
  latencyMs: number;
}): Promise<void> {
  await sql`
    INSERT INTO enrichment_requests
      (account_id, api_key_id, correlation_id, input_hash, input_domain, cached, credit_consumed, response_shape, latency_ms)
    VALUES
      (${params.accountId}, ${params.apiKeyId}, ${params.correlationId},
       ${params.inputHash}, ${params.inputDomain}, true, false, ${params.responseShape}, ${params.latencyMs})
  `.catch(err => console.error("[LEDGER] Failed to log cache hit:", err));
}

/**
 * Grant credits to an account (from NOWPayments purchase or admin grant).
 */
export async function grantCredits(params: {
  accountId: string;
  amount: number;
  type: "purchase" | "admin_grant";
  paymentId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const result = await sql.begin(async tx => {
    const [acct] = await tx`
      SELECT balance FROM credit_accounts
      WHERE id = ${params.accountId} AND status = 'active'
      FOR UPDATE
    `;

    if (!acct) throw new Error(`Account ${params.accountId} not found or not active`);

    const newBalance = (acct.balance as number) + params.amount;

    await tx`
      UPDATE credit_accounts
      SET balance = ${newBalance}, updated_at = now()
      WHERE id = ${params.accountId}
    `;

    await tx`
      INSERT INTO credit_transactions
        (account_id, type, amount, balance_after, payment_id, correlation_id, metadata)
      VALUES
        (${params.accountId}, ${params.type}, ${params.amount}, ${newBalance},
         ${params.paymentId ?? null}, ${params.correlationId ?? null},
         ${params.metadata ? JSON.stringify(params.metadata) : null})
    `;

    return newBalance;
  });

  return result;
}

/**
 * Get the current balance for an account.
 */
export async function getBalance(accountId: string): Promise<number> {
  const [row] = await sql`
    SELECT balance FROM credit_accounts WHERE id = ${accountId}
  `;
  return row ? (row.balance as number) : 0;
}
