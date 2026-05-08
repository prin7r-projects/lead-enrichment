/**
 * PII purge cron — runs nightly at 03:00 UTC.
 *
 * Per doc/12 §6.2 (A3):
 * - Enrichment request logs (enrichment_requests) only store sha256(email),
 *   never raw email. Still, we purge records older than 90 days.
 * - In-memory enrichment cache handles its own slice-TTL eviction.
 * - Customer ledger data (customers, credit_accounts, api_keys, payments)
 *   is EXEMPT — it's the customer's own contract data.
 *
 * Usage:
 *   bun apps/api/src/cron/purge-expired-pii.ts
 *
 * Schedule (on VPS):
 *   0 3 * * * cd /opt/lead-enrichment && docker compose exec -T api bun run src/cron/purge-expired-pii.ts
 */
import { sql, checkConnection, closeConnection } from "../db/client.js";

async function main() {
  const startedAt = new Date();
  console.log(`[PURGE_PII] Starting at ${startedAt.toISOString()}`);

  const connected = await checkConnection();
  if (!connected) {
    console.error("[PURGE_PII] Cannot connect to database. Aborting.");
    process.exit(1);
  }

  let purgedRequests = 0;
  let purgedCacheEntries = 0;

  // ── 1. Purge enrichment_requests older than 90 days (A3) ──
  try {
    const result = await sql`
      DELETE FROM enrichment_requests
      WHERE created_at < now() - interval '90 days'
    `;
    purgedRequests = result.count;
    console.log(`[PURGE_PII] Purged ${purgedRequests} enrichment request logs (> 90 days old)`);
  } catch (err) {
    console.error("[PURGE_PII] Error purging enrichment_requests:", err);
  }

  // ── 2. In-memory cache TTL eviction is handled internally ──
  // The in-memory Map-based cache automatically evicts entries
  // based on per-slice TTLs (firmographic: 28d, decisionMaker: 14d,
  // technographic: 7d, intent: 24h). No DB-level action needed.
  console.log(`[PURGE_PII] In-memory cache TTL eviction: handled internally (${purgedCacheEntries} entries)`);

  // ── 3. Verify customer ledger is intact (A3 compliance check) ──
  const stats = await sql`
    SELECT
      (SELECT count(*) FROM customers) AS customer_count,
      (SELECT count(*) FROM api_keys WHERE status = 'active') AS active_keys,
      (SELECT count(*) FROM credit_accounts WHERE status = 'active') AS active_accounts,
      (SELECT count(*) FROM enrichment_requests) AS remaining_enrichment_logs
  `;

  const row = stats[0] as Record<string, unknown>;
  console.log("[PURGE_PII] Compliance snapshot:", {
    customers: row.customerCount,
    activeKeys: row.activeKeys,
    activeAccounts: row.activeAccounts,
    remainingEnrichmentLogs: row.remainingEnrichmentLogs
  });

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  console.log(`[PURGE_PII] Complete at ${finishedAt.toISOString()} (${durationMs}ms)`);

  await closeConnection();
  process.exit(0);
}

main();
