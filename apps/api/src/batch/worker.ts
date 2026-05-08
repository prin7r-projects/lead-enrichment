/**
 * Batch enrichment worker.
 *
 * Polls for queued EnrichmentJobs, processes rows through the enrich engine,
 * writes result CSV to local filesystem, updates job progress, and fires
 * completion webhook via dispatchWebhook.
 *
 * Rate limit: ≤50 RPS internal fan-out (token bucket).
 */
import { sql } from "../db/client.js";
import { enrich } from "../enrich.js";
import { parseCsv, validateIdentifierColumns, rowToEnrichInput, escapeCsvField } from "./csv.js";
import { dispatchWebhook } from "../webhooks/dispatch.js";
import { consumeCredit } from "../ledger/index.js";
import { sha256 } from "../auth/index.js";
import type { IdentifierType } from "./csv.js";

const BATCH_DIR = process.env.BATCH_STORAGE_DIR ?? "/data/batch";
const MAX_RPS = 50;
const POLL_INTERVAL_MS = 5_000; // poll every 5s

let running = false;

/**
 * Start the batch worker loop. Call once at API startup.
 * Runs in the background; does not block the server.
 */
export function startBatchWorker(): void {
  if (running) return;
  running = true;
  console.log("[BATCH] Worker started. Polling every", POLL_INTERVAL_MS, "ms");
  poll();
}

async function poll(): Promise<void> {
  while (running) {
    try {
      const job = await claimNextJob();
      if (job) {
        console.log("[BATCH] Processing job:", job.jobId, "rows:", job.rowCount);
        await processJob(job);
      }
    } catch (err) {
      console.error("[BATCH] Poll error:", err);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

interface QueuedJob {
  jobId: string;
  accountId: string;
  csvPath: string;
  webhookUrl: string | null;
  rowCount: number;
  idType: IdentifierType;
  headers: string[];
  rawRows: string[][];
}

/**
 * Claim the next queued job (atomically set status to 'processing').
 * Returns null if no jobs are queued.
 */
async function claimNextJob(): Promise<QueuedJob | null> {
  const result = await sql.begin(async tx => {
    const [job] = await tx`
      SELECT id, account_id, csv_path, webhook_url, row_count
      FROM enrichment_jobs
      WHERE status = 'queued'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!job) return null;

    // Mark as processing
    await tx`
      UPDATE enrichment_jobs
      SET status = 'processing', started_at = now()
      WHERE id = ${job.id as string}
    `;

    return job;
  });

  if (!result) return null;

  // Read and parse CSV
  const csvContent = await Bun.file(result.csvPath as string).text();
  const parsed = parseCsv(csvContent);
  const idType = validateIdentifierColumns(parsed.headers);
  if (!idType) {
    throw new Error(`CSV missing required identifier columns. Headers: ${parsed.headers.join(", ")}`);
  }

  return {
    jobId: result.id as string,
    accountId: result.accountId as string,
    csvPath: result.csvPath as string,
    webhookUrl: result.webhookUrl as string | null,
    rowCount: result.rowCount as number,
    idType,
    headers: parsed.headers,
    rawRows: parsed.rawRows
  };
}

/**
 * Process a single batch job.
 */
async function processJob(job: QueuedJob): Promise<void> {
  const resultPath = `${BATCH_DIR}/job_${job.jobId}_results.csv`;
  const resultFile = Bun.file(resultPath);
  const writer = resultFile.writer();

  let flattenedHeaders: string[] | null = null;
  let completedRows = 0;
  let failedRows = 0;
  let creditsConsumed = 0;

  // Token bucket for rate limiting
  let tokens = MAX_RPS;
  let lastRefill = Date.now();
  const refillRate = MAX_RPS; // tokens per second

  try {
    for (let i = 0; i < job.rawRows.length; i++) {
      // Rate limit: token bucket
      const now = Date.now();
      const elapsed = (now - lastRefill) / 1000;
      tokens = Math.min(MAX_RPS, tokens + elapsed * refillRate);
      lastRefill = now;

      if (tokens < 1) {
        await sleep(Math.ceil((1 - tokens) / refillRate * 1000));
        tokens = 1;
      }
      tokens -= 1;

      const row = job.rawRows[i];
      const rowMap: Record<string, string> = {};
      for (let j = 0; j < job.headers.length; j++) {
        rowMap[job.headers[j]] = row[j]?.trim() ?? "";
      }

      const input = rowToEnrichInput(rowMap, job.idType);

      // Skip rows with empty identifiers
      if (!input.email && !input.domain && !(input.firstName && input.lastName && input.company)) {
        failedRows++;
        continue;
      }

      try {
        const startMs = Date.now();
        const response = await enrich({
          input,
          correlationId: `batch_${job.jobId}_${i}`,
          apiKey: `batch_internal_${job.accountId}`,
          euRestricted: false
        });
        const latencyMs = Date.now() - startMs;

        // Flatten response for CSV
        const flat = flattenEnrichResponse(response);
        if (!flattenedHeaders) {
          flattenedHeaders = Object.keys(flat);
        }

        // Write header row on first result
        if (i === 0 && flattenedHeaders) {
          const headerLine = [...job.headers, ...flattenedHeaders].map(escapeCsvField).join(",") + "\n";
          writer.write(headerLine);
        }

        // Write data row
        const flatValues = flattenedHeaders!.map(h => escapeCsvField(String(flat[h] ?? "")));
        const line = [...row.map(escapeCsvField), ...flatValues].join(",") + "\n";
        writer.write(line);

        // Consume credit
        const inputHash = sha256(
          [input.email, input.domain, input.firstName, input.lastName, input.company].filter(Boolean).join("|")
        );
        const { consumed } = await consumeCredit({
          accountId: job.accountId,
          apiKeyId: "batch_internal",
          correlationId: `batch_${job.jobId}_${i}`,
          inputHash,
          inputDomain: input.domain ?? "",
          responseShape: Object.keys(flat).join(","),
          latencyMs
        });

        if (consumed) creditsConsumed++;
        completedRows++;
      } catch {
        failedRows++;
      }

      // Update progress every 50 rows
      if (completedRows % 50 === 0) {
        await updateProgress(job.jobId, completedRows, failedRows, creditsConsumed);
      }
    }
  } finally {
    writer.end();
  }

  // Final status update
  const status = failedRows === 0 ? "completed" : failedRows === job.rowCount ? "failed" : "partial";
  await sql`
    UPDATE enrichment_jobs
    SET status = ${status},
        completed_rows = ${completedRows},
        failed_rows = ${failedRows},
        credits_consumed = ${creditsConsumed},
        result_path = ${resultPath},
        completed_at = now()
    WHERE id = ${job.jobId}
  `;

  console.log("[BATCH] Job complete:", job.jobId, "status:", status, "completed:", completedRows, "failed:", failedRows);

  // Fire webhook if configured
  if (job.webhookUrl) {
    dispatchWebhook({
      url: job.webhookUrl,
      payload: {
        jobId: job.jobId,
        status,
        rowCount: job.rowCount,
        completedRows,
        failedRows,
        creditsConsumed,
        downloadUrl: `https://lead-enrichment.prin7r.com/v1/jobs/${job.jobId}/download`
      },
      secret: sha256(job.accountId),
      correlationId: `batch_complete_${job.jobId}`
    }).catch(err => console.error("[BATCH] Webhook dispatch failed:", err));
  }
}

async function updateProgress(
  jobId: string,
  completedRows: number,
  failedRows: number,
  creditsConsumed: number
): Promise<void> {
  await sql`
    UPDATE enrichment_jobs
    SET completed_rows = ${completedRows},
        failed_rows = ${failedRows},
        credits_consumed = ${creditsConsumed}
    WHERE id = ${jobId}
  `;
}

/**
 * Flatten a nested enrich response object into a single-level map
 * with dot-separated keys prefixed by "triangulate.".
 */
function flattenEnrichResponse(
  obj: Record<string, unknown>,
  prefix = "triangulate"
): Record<string, string> {
  const result: Record<string, string> = {};

  function walk(value: unknown, path: string[]): void {
    if (value === null || value === undefined) {
      result[path.join(".")] = "";
    } else if (Array.isArray(value)) {
      // Arrays become JSON strings
      result[path.join(".")] = JSON.stringify(value);
    } else if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      for (const [key, val] of Object.entries(obj)) {
        walk(val, [...path, key]);
      }
    } else {
      result[path.join(".")] = String(value);
    }
  }

  walk(obj, [prefix]);
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
