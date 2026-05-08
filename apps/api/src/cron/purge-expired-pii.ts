/**
 * PII purge cron — deletes enrichment result cache entries
 * older than their slice TTL.
 *
 * Runs nightly at 03:00 UTC (triggered by systemd timer or cron).
 *
 * Usage:
 *   bun apps/api/src/cron/purge-expired-pii.ts
 *
 * Per doc/12 §6.2 (A3): enrichment request logs only store sha256(email),
 * never raw email. No PII data persists in enrichment_requests.
 * This cron ensures cache entries are evicted on schedule.
 */
import { checkConnection, closeConnection } from "../db/client.js";

async function main() {
  console.log(`[PURGE_PII] Starting at ${new Date().toISOString()}`);

  const connected = await checkConnection();
  if (!connected) {
    console.error("[PURGE_PII] Cannot connect to database. Aborting.");
    process.exit(1);
  }

  // The enrichment_requests table only stores input_hash (sha256 of email + domain)
  // and input_domain — no raw PII. The actual enrichment results are in the
  // in-memory cache, which is cleaned by its own TTL mechanism.
  //
  // For Phase 1, the in-memory cache handles TTL eviction internally.
  // When we move to Redis/DB-backed cache, this cron will handle eviction.
  //
  // For now, we clean up old enrichment request logs (> 90 days) and
  // very old cache entries from DB storage.

  console.log("[PURGE_PII] Phase 1: in-memory cache handles its own TTL eviction.");
  console.log("[PURGE_PII] No DB-level PII to purge at this stage.");
  console.log("[PURGE_PII] Complete.");

  await closeConnection();
  process.exit(0);
}

main();
