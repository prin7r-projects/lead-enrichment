/**
 * API key generation, hashing, and validation.
 *
 * Key format: tri_live_<ulid>_<base32rand>
 *
 * We only store sha256(rawKey) in the database. The raw key is
 * returned exactly once (at creation time) and never recoverable.
 */
import { createHash, randomBytes } from "node:crypto";
import { sql } from "../db/client.js";

const KEY_PREFIX = "tri_live_";

/** Crockford base32 alphabet (no I, L, O, U for readability). */
const BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generate a new API key. Returns the raw key (to give to the user once)
 * and the sha256 hash (to store in the DB).
 */
export function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, "0");
  const rand1 = Array.from({ length: 16 }, () => BASE32[Math.floor(Math.random() * BASE32.length)]).join("");
  const ulid = `${ts}${rand1}`;
  const rand2 = Array.from({ length: 16 }, () => BASE32[Math.floor(Math.random() * BASE32.length)]).join("");
  const rawKey = `${KEY_PREFIX}${ulid}_${rand2}`;
  const prefix = rawKey.slice(0, KEY_PREFIX.length + 10); // tri_live_<first10chars>
  const hash = sha256(rawKey);
  return { rawKey, prefix, hash };
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export interface ApiKeyRow {
  id: string;
  customerId: string;
  prefix: string;
  keyHash: string;
  label: string;
  status: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

export interface AuthContext {
  keyId: string;
  customerId: string;
  accountId: string;
  tier: string;
  balance: number;
}

/**
 * Validate a bearer token and return the authenticated context.
 * Returns null if the key is invalid, revoked, or expired.
 */
export async function validateApiKey(rawKey: string): Promise<AuthContext | null> {
  if (!rawKey || rawKey.length < 20) return null;

  const hash = sha256(rawKey);

  const rows = await sql`
    SELECT
      ak.id AS key_id,
      ak.customer_id,
      ak.status AS key_status,
      ca.id AS account_id,
      ca.balance,
      ca.tier,
      ca.status AS account_status
    FROM api_keys ak
    JOIN credit_accounts ca ON ca.customer_id = ak.customer_id
    WHERE ak.key_hash = ${hash}
    LIMIT 1
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  // Reject revoked keys.
  if (row.key_status !== "active") return null;

  // Reject expired keys.
  if (row.expires_at && new Date(row.expires_at as string) < new Date()) return null;

  // Update last_used_at asynchronously (don't block the request).
  sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${row.key_id as string}`.catch(err =>
    console.error("[AUTH] Failed to update last_used_at:", err)
  );

  return {
    keyId: row.key_id as string,
    customerId: row.customer_id as string,
    accountId: row.account_id as string,
    tier: (row.tier as string) ?? "starter",
    balance: (row.balance as number) ?? 0
  };
}

/**
 * Create a customer + credit account + API key in a single transaction.
 * Used for NOWPayments IPN flow and admin pilot issuance.
 */
export async function createCustomerWithKey(params: {
  email: string;
  credits?: number;
  label?: string;
}): Promise<{ customerId: string; accountId: string; rawKey: string; keyId: string }> {
  const { rawKey, prefix, hash } = generateApiKey();

  const result = await sql.begin(async tx => {
    // Upsert customer
    const [cust] = await tx`
      INSERT INTO customers (email)
      VALUES (${params.email})
      ON CONFLICT (email) DO UPDATE SET updated_at = now()
      RETURNING id
    `;

    // Upsert credit account
    const initialBalance = params.credits ?? 0;
    const [acct] = await tx`
      INSERT INTO credit_accounts (customer_id, balance, tier, status)
      VALUES (${cust.id as string}, ${initialBalance}, 'starter', 'active')
      ON CONFLICT (customer_id) DO NOTHING
      RETURNING id
    `;

    let accountId = acct?.id as string | undefined;
    if (!accountId) {
      // Account already existed — fetch it
      const [existing] = await tx`
        SELECT id FROM credit_accounts WHERE customer_id = ${cust.id as string}
      `;
      accountId = existing?.id as string;
    }

    // Create API key
    const [key] = await tx`
      INSERT INTO api_keys (customer_id, prefix, key_hash, label)
      VALUES (${cust.id as string}, ${prefix}, ${hash}, ${params.label ?? "default"})
      RETURNING id
    `;

    // If initial credits are granted, record the transaction
    if (initialBalance > 0) {
      const currentBalance = initialBalance;
      await tx`
        INSERT INTO credit_transactions (account_id, type, amount, balance_after, metadata)
        VALUES (${accountId!}, 'admin_grant', ${initialBalance}, ${currentBalance}, ${JSON.stringify({ reason: params.label ?? "initial_grant" })})
      `;
    }

    return {
      customerId: cust.id as string,
      accountId: accountId!,
      rawKey,
      keyId: key.id as string
    };
  });

  return result;
}
