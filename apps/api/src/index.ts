/**
 * Triangulate API — Hono + Bun server.
 *
 * Phase 4: Batch enrichment (CSV upload, worker, job status, download).
 * Phase 3: Webhook-fired enrichment, API key management, dashboard foundation.
 * Phase 1-2: Auth, credit ledger, rate limiting, caching, GDPR, PII purge, IPN.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { enrich } from "./enrich.js";
import { validateApiKey, type AuthContext } from "./auth/index.js";
import { consumeCredit, getCreditUsage, logCacheHit, grantCredits } from "./ledger/index.js";
import { checkRateLimit } from "./rate-limit/index.js";
import { buildCacheKey, getCached, setCached } from "./cache/index.js";
import { migrate } from "./db/migrate.js";
import { checkConnection, sql } from "./db/client.js";
import { dispatchWebhook } from "./webhooks/dispatch.js";
import { startBatchWorker } from "./batch/worker.js";
import { parseCsv, validateIdentifierColumns, rowToEnrichInput } from "./batch/csv.js";

// ─── Types ───────────────────────────────────────────────

type Variables = {
  correlationId: string;
  auth: AuthContext;
};

// ─── App ─────────────────────────────────────────────────

const app = new Hono<{ Variables: Variables }>();

// Always JSON; never HTML 500s.
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["authorization", "content-type", "x-request-id"],
    exposeHeaders: ["x-triangulate-correlation-id", "retry-after"],
    maxAge: 86400
  })
);

// Correlation ID middleware.
app.use("*", async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const correlationId = incoming || makeCorrelationId();
  c.set("correlationId", correlationId);
  c.header("x-triangulate-correlation-id", correlationId);
  await next();
});

// ─── Public endpoints ────────────────────────────────────

app.get("/healthz", (c) =>
  c.json({
    status: "ok",
    service: "triangulate-api",
    version: "0.4.0",
    ts: Date.now()
  })
);

app.get("/v1/coverage", (c) =>
  c.json({
    regions: [
      { code: "NA", coveragePct: 94, freshnessDays: 28 },
      { code: "EMEA", coveragePct: 81, freshnessDays: 28 },
      { code: "LATAM", coveragePct: 62, freshnessDays: 28 },
      { code: "APAC", coveragePct: 71, freshnessDays: 28 }
    ],
    fields: {
      "person.fullName": { confidenceMedian: 0.94, sourcesPerField: 1.4 },
      "person.title": { confidenceMedian: 0.92, sourcesPerField: 1.6 },
      "company.industry": { confidenceMedian: 0.95, sourcesPerField: 1.2 },
      "company.employeeCount": { confidenceMedian: 0.83, sourcesPerField: 1.1 },
      "company.fundingStage": { confidenceMedian: 0.91, sourcesPerField: 1.3 },
      "technographics": { confidenceMedian: 0.93, sourcesPerField: 1.0 },
      "intent.hiring": { confidenceMedian: 0.97, sourcesPerField: 1.0 },
      "contactTriangulation.emailDeliverability": { confidenceMedian: 0.92, sourcesPerField: 1.0 }
    },
    methodology:
      "Coverage measured against a benchmark of 1,000 ICP-shape companies (B2B SaaS, Series A–C, 50–500 employees), refreshed quarterly."
  })
);

// ─── Auth middleware ──────────────────────────────────────

const AUTH_SKIP_PATHS = new Set(["/healthz", "/v1/coverage", "/v1/internal/ipn"]);

app.use("/v1/*", async (c, next) => {
  if (AUTH_SKIP_PATHS.has(c.req.path)) return next();

  const auth = c.req.header("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1].trim()) {
    return c.json(
      {
        error: "unauthorized",
        message: "Missing or malformed Authorization header. Expected: Bearer <api_key>.",
        correlationId: c.get("correlationId")
      },
      401
    );
  }

  const rawKey = match[1].trim();
  const ctx = await validateApiKey(rawKey);
  if (!ctx) {
    return c.json(
      {
        error: "unauthorized",
        message: "Invalid or revoked API key.",
        correlationId: c.get("correlationId")
      },
      401
    );
  }

  // Check credit balance for enrichment endpoints
  if (c.req.path === "/v1/enrich" && ctx.balance < 1) {
    return c.json(
      {
        error: "no_credits",
        message: "Credit balance exhausted. Purchase more credits at https://lead-enrichment.prin7r.com.",
        correlationId: c.get("correlationId")
      },
      402
    );
  }

  c.set("auth", ctx);
  await next();
});

// ─── Rate limit middleware ────────────────────────────────

app.use("/v1/*", async (c, next) => {
  const auth = c.get("auth");
  if (!auth) return next();

  const keyHash = auth.keyId;
  const tier = auth.tier ?? "starter";
  const { allowed, retryAfterMs } = checkRateLimit(keyHash, tier);

  if (!allowed) {
    c.header("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
    return c.json(
      {
        error: "rate_limited",
        limit: tier === "starter" ? 50 : tier === "team" ? 250 : 1000,
        window: "1s",
        retryAfterMs
      },
      429
    );
  }

  await next();
});

// ─── POST /v1/enrich ─────────────────────────────────────

const enrichBody = z
  .object({
    email: z.string().email().optional(),
    domain: z
      .string()
      .min(3)
      .regex(/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "Domain must look like example.com")
      .optional(),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    company: z.string().min(1).max(200).optional(),
    webhookUrl: z.string().url().max(500).optional()
  })
  .refine(
    (v) => Boolean(v.email) || Boolean(v.domain) || Boolean(v.firstName && v.lastName && v.company),
    {
      message:
        "Provide one of: { email }, { domain }, or { firstName, lastName, company }."
    }
  );

app.post(
  "/v1/enrich",
  zValidator("json", enrichBody, (result, c) => {
    if (!result.success) {
      const correlationId = c.req.header("x-triangulate-correlation-id") ?? "unknown";
      return c.json(
        {
          error: "bad_request",
          message: "Invalid request body.",
          issues: result.error.issues,
          correlationId
        },
        400
      );
    }
  }),
  async (c) => {
    const body = c.req.valid("json");
    const correlationId = c.get("correlationId");
    const auth = c.get("auth");

    // ── Free-mail exclusion (A1) ──
    if (body.email && isFreeMail(body.email)) {
      return c.json(
        {
          request: {
            input: body,
            correlationId,
            ts: Date.now(),
            latencyMs: 0,
            cached: false
          },
          person: null,
          meta: {
            policy: "personal_email_excluded",
            creditsRemaining: auth.balance,
            note: "Free email providers (gmail.com, yahoo.com, etc.) are excluded from enrichment. No credit consumed."
          }
        },
        200
      );
    }

    // ── GDPRegion policy (ES3) ──
    const isEU = body.email ? isEUDomain(body.email) : body.domain ? isEUDomain(`@${body.domain}`) : false;

    // ── Cache check (S11) ──
    const cacheKey = buildCacheKey(body);
    const cached = getCached(cacheKey);

    if (cached) {
      // Log cache hit — no credit consumed
      logCacheHit({
        accountId: auth.accountId,
        apiKeyId: auth.keyId,
        correlationId,
        inputHash: cacheKey,
        inputDomain: body.domain ?? domainFromEmail(body.email) ?? "",
        responseShape: responseShapeFromData(cached.data),
        latencyMs: 0
      }).catch(err => console.error("[CACHE] Failed to log cache hit:", err));

      // Merge cached slices + inject credit info
      const cachedMeta = (cached.data as Record<string, unknown>).meta as Record<string, unknown> | undefined;
      return c.json(
        {
          ...cached.data,
          request: {
            input: body,
            correlationId,
            ts: Date.now(),
            latencyMs: 0,
            cached: true
          },
          meta: {
            ...(cachedMeta ?? {}),
            creditsRemaining: auth.balance,
            cached: true
          }
        },
        200
      );
    }

    // ── Enrich ──
    const startedMs = Date.now();
    const response = await enrich({
      input: body,
      correlationId,
      apiKey: auth.keyId,
      euRestricted: isEU
    });
    const latencyMs = Date.now() - startedMs;

    // Apply EU restriction if applicable
    if (isEU && response.person) {
      // Role-anonymize: keep name + title, strip location and detailed department
      response.meta = response.meta ?? {};
      (response.meta as Record<string, unknown>).regionPolicy = "EU-restricted";
    }

    // ── Cache write ──
    setCached(cacheKey, {
      firmographic: { company: response.company },
      decisionMaker: { person: response.person },
      technographic: { technographics: response.technographics },
      intent: { intent: response.intent },
      meta: { meta: response.meta },
      contact: { contactTriangulation: response.contactTriangulation }
    });

    // ── Credit consumption ──
    const { consumed, balanceAfter } = await consumeCredit({
      accountId: auth.accountId,
      apiKeyId: auth.keyId,
      correlationId,
      inputHash: cacheKey,
      inputDomain: body.domain ?? domainFromEmail(body.email) ?? "",
      responseShape: responseShapeFromResponse(response),
      latencyMs
    });

    if (!consumed) {
      return c.json(
        {
          error: "no_credits",
          message: "Credit balance exhausted.",
          correlationId
        },
        402
      );
    }

    // Inject credit info into response
    response.request = {
      input: body,
      correlationId,
      ts: startedMs,
      latencyMs,
      cached: false
    };
    response.meta = {
      ...(response.meta ?? {}),
      creditsRemaining: balanceAfter
    };

    // ── Webhook dispatch (S3) ── fire-and-forget
    if (body.webhookUrl) {
      dispatchWebhook({
        url: body.webhookUrl,
        payload: response as unknown as Record<string, unknown>,
        secret: auth.keyId, // API key hash as shared secret
        correlationId
      }).then(result => {
        if (!result.ok) {
          console.error("[WEBHOOK] Dispatch failed:", {
            webhookUrl: body.webhookUrl,
            correlationId,
            attempts: result.attempts,
            lastStatus: result.lastStatus,
            lastError: result.lastError
          });
        }
      }).catch(err => {
        console.error("[WEBHOOK] Dispatch error:", err);
      });
    }

    return c.json(response, 200);
  }
);

// ─── GET /v1/credits ─────────────────────────────────────

app.get("/v1/credits", async (c) => {
  const auth = c.get("auth");
  const usage = await getCreditUsage(auth);

  // Upgrade nudge (S10)
  if (auth.tier === "starter" && usage.balance < 300) {
    return c.json({
      ...usage,
      nudge: {
        threshold: 300,
        remaining: usage.balance,
        message: `You've used ${usage.lifetimeConsumed} of your Starter credits. Upgrade to Team for 19% off per credit.`,
        upgradeUrl: "/?pricing"
      }
    });
  }

  return c.json(usage);
});

// ─── GET /v1/api-keys ────────────────────────────────────

app.get("/v1/api-keys", async (c) => {
  const auth = c.get("auth");

  const rows = await sql`
    SELECT id, prefix, label, status, created_at, last_used_at
    FROM api_keys
    WHERE customer_id = ${auth.customerId}
    ORDER BY created_at DESC
  `;

  const keys = (rows as Array<Record<string, unknown>>).map(r => ({
    id: r.id as string,
    prefix: r.prefix as string,
    label: r.label as string,
    status: r.status as string,
    createdAt: (r.createdAt as Date).toISOString(),
    lastUsedAt: r.lastUsedAt ? (r.lastUsedAt as Date).toISOString() : null
  }));

  return c.json({ keys });
});

// ─── POST /v1/api-keys ───────────────────────────────────

const createKeyBody = z.object({
  label: z.string().min(1).max(80).optional()
});

app.post(
  "/v1/api-keys",
  zValidator("json", createKeyBody, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "bad_request", message: "Invalid request body.", issues: result.error.issues },
        400
      );
    }
  }),
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const { generateApiKey } = await import("./auth/index.js");

    const { rawKey, prefix, hash } = generateApiKey();

    const [row] = await sql`
      INSERT INTO api_keys (customer_id, prefix, key_hash, label)
      VALUES (${auth.customerId}, ${prefix}, ${hash}, ${body.label ?? "api-created"})
      RETURNING id, created_at
    `;

    return c.json(
      {
        id: (row as Record<string, unknown>).id as string,
        key: rawKey,
        prefix,
        label: body.label ?? "api-created",
        createdAt: ((row as Record<string, unknown>).createdAt as Date).toISOString()
      },
      201
    );
  }
);

// ─── DELETE /v1/api-keys/:id ─────────────────────────────

app.delete("/v1/api-keys/:id", async (c) => {
  const auth = c.get("auth");
  const keyId = c.req.param("id");

  // Prevent self-revocation
  if (keyId === auth.keyId) {
    return c.json(
      { error: "bad_request", message: "Cannot revoke the API key used for this request." },
      400
    );
  }

  const result = await sql`
    UPDATE api_keys
    SET status = 'revoked'
    WHERE id = ${keyId} AND customer_id = ${auth.customerId} AND status = 'active'
    RETURNING id
  `;

  if (result.length === 0) {
    return c.json(
      { error: "not_found", message: "API key not found or already revoked." },
      404
    );
  }

  return c.json({ ok: true, revoked: keyId });
});

// ─── Batch enrichment endpoints (Phase 4) ────────────────

const BATCH_DIR = process.env.BATCH_STORAGE_DIR ?? "/data/batch";

app.post("/v1/enrich/batch", async (c) => {
  const auth = c.get("auth");

  // Team tier minimum for batch
  if (auth.tier === "starter") {
    return c.json(
      { error: "bad_request", message: "Batch enrichment requires Team tier or higher." },
      400
    );
  }

  const formData = await c.req.formData().catch(() => null);
  if (!formData) {
    return c.json(
      { error: "bad_request", message: "Expected multipart/form-data with a 'file' field." },
      400
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return c.json(
      { error: "bad_request", message: "Missing 'file' field in form data." },
      400
    );
  }

  // Validate file extension
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return c.json(
      { error: "bad_request", message: "File must be a CSV." },
      400
    );
  }

  // Max file size: 50MB
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return c.json(
      { error: "too_large", message: "File exceeds 50MB limit." },
      413
    );
  }

  let content: string;
  try {
    content = await file.text();
  } catch {
    return c.json(
      { error: "bad_request", message: "Failed to read CSV file." },
      400
    );
  }

  // Parse CSV
  let parsed;
  try {
    parsed = parseCsv(content);
  } catch (err) {
    return c.json(
      { error: "bad_request", message: err instanceof Error ? err.message : "Failed to parse CSV." },
      400
    );
  }

  // Validate identifier column
  const idType = validateIdentifierColumns(parsed.headers);
  if (!idType) {
    return c.json(
      {
        error: "bad_request",
        message: "CSV missing required identifier column. Must include email, domain, or firstName+lastName+company.",
        headers: parsed.headers
      },
      400
    );
  }

  const rowCount = parsed.rows.length;

  // Row limit per tier
  const maxRows = auth.tier === "scale" ? 100_000 : 10_000;
  if (rowCount > maxRows) {
    return c.json(
      {
        error: "bad_request",
        message: `Row count ${rowCount} exceeds ${auth.tier} tier limit of ${maxRows}.`
      },
      400
    );
  }

  // Credit balance check
  if (auth.balance < rowCount) {
    return c.json(
      {
        error: "no_credits",
        message: `Insufficient credits. Need ${rowCount}, have ${auth.balance}.`
      },
      402
    );
  }

  // Store CSV on local filesystem (S3-compat placeholder)
  const { mkdirSync } = await import("node:fs");
  mkdirSync(BATCH_DIR, { recursive: true });

  const jobId = `job_${makeCorrelationId()}`;
  const csvPath = `${BATCH_DIR}/${jobId}_input.csv`;
  const webhookUrl = (formData.get("webhookUrl") as string) || null;

  // Write CSV
  const { writeFileSync } = await import("node:fs");
  writeFileSync(csvPath, content, "utf-8");

  // Create enrichment job
  const [job] = await sql`
    INSERT INTO enrichment_jobs (id, account_id, status, row_count, csv_path, webhook_url)
    VALUES (${jobId}, ${auth.accountId}, 'queued', ${rowCount}, ${csvPath}, ${webhookUrl ?? null})
    RETURNING id, created_at
  `;

  // Estimate duration: ~50 RPS + overhead
  const estimatedDurationSec = Math.ceil(rowCount / 50) + 10;

  return c.json(
    {
      jobId,
      status: "queued",
      rowCount,
      estimatedCredits: rowCount,
      estimatedDurationSec,
      createdAt: (job as Record<string, unknown>).createdAt
    },
    202
  );
});

app.get("/v1/jobs/:id", async (c) => {
  const auth = c.get("auth");
  const jobId = c.req.param("id");

  const [job] = await sql`
    SELECT id, account_id, status, row_count, completed_rows, failed_rows,
           credits_consumed, result_path, webhook_url, webhook_fired,
           created_at, started_at, completed_at
    FROM enrichment_jobs
    WHERE id = ${jobId} AND account_id = ${auth.accountId}
  `;

  if (!job) {
    return c.json({ error: "not_found", message: "Job not found." }, 404);
  }

  const j = job as Record<string, unknown>;
  const status = j.status as string;
  const result: Record<string, unknown> = {
    jobId: j.id,
    status,
    rowCount: j.rowCount,
    completedRows: j.completedRows,
    failedRows: j.failedRows,
    estimatedCredits: j.rowCount,
    creditsConsumed: j.creditsConsumed,
    createdAt: j.createdAt,
    completedAt: j.completedAt ?? null,
    webhookFired: j.webhookFired
  };

  if (status === "completed" || status === "partial") {
    result.downloadUrl = `https://lead-enrichment.prin7r.com/v1/jobs/${jobId}/download`;
  }

  return c.json(result);
});

app.get("/v1/jobs/:id/download", async (c) => {
  const auth = c.get("auth");
  const jobId = c.req.param("id");

  const [job] = await sql`
    SELECT id, status, result_path
    FROM enrichment_jobs
    WHERE id = ${jobId} AND account_id = ${auth.accountId}
  `;

  if (!job || !(job as Record<string, unknown>).resultPath) {
    return c.json({ error: "not_found", message: "Results not available." }, 404);
  }

  const status = (job as Record<string, unknown>).status as string;
  if (status !== "completed" && status !== "partial") {
    return c.json(
      { error: "not_ready", message: `Job status is '${status}'. Results not yet available.` },
      409
    );
  }

  const resultPath = (job as Record<string, unknown>).resultPath as string;
  const file = Bun.file(resultPath);
  const exists = await file.exists();
  if (!exists) {
    return c.json({ error: "not_found", message: "Result file not found." }, 404);
  }

  return new Response(file, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${jobId}_results.csv"`
    }
  });
});

// ─── Internal IPN endpoint ────────────────────────────────

const ipnBody = z.object({
  orderId: z.string(),
  packId: z.string(),
  email: z.string().email().optional(),
  paymentStatus: z.string(),
  payCurrency: z.string().optional(),
  payAmount: z.number().optional(),
  priceUsd: z.number(),
  credits: z.number()
});

app.post(
  "/v1/internal/ipn",
  zValidator("json", ipnBody, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "bad_request", message: "Invalid IPN body.", issues: result.error.issues },
        400
      );
    }
  }),
  async (c) => {
    const body = c.req.valid("json");

    // Only process completed payments
    if (body.paymentStatus !== "finished" && body.paymentStatus !== "confirmed") {
      return c.json({ ok: true, processed: false, reason: "payment not completed" });
    }

    // This is called from the landing IPN webhook with email from NOWPayments payload.
    // If no email, we can't create a customer — return error.
    if (!body.email) {
      return c.json({ error: "missing_email", message: "IPN payload must include customer email." }, 400);
    }

    try {
      // Create or find customer, credit account, and API key
      const { createCustomerWithKey } = await import("./auth/index.js");
      const result = await createCustomerWithKey({
        email: body.email,
        credits: 0, // Credits granted separately via grantCredits with correct type
        label: `purchase_${body.packId}`
      });

      // Grant credits
      await grantCredits({
        accountId: result.accountId,
        amount: body.credits,
        type: "purchase",
        paymentId: undefined // payment record is in landing app's DB
      });

      // Send API key email
      const { sendApiKeyEmail } = await import("./email/index.js");
      const packNames: Record<string, string> = {
        starter: "Starter",
        team: "Team",
        scale: "Scale"
      };
      sendApiKeyEmail(body.email!, result.rawKey, packNames[body.packId] ?? body.packId)
        .catch(err => console.error("[IPN] Failed to send API key email:", err));

      return c.json({
        ok: true,
        processed: true,
        customerId: result.customerId,
        accountId: result.accountId,
        apiKey: result.rawKey,
        creditsGranted: body.credits
      });
    } catch (err) {
      console.error("[IPN] Failed to process IPN:", err);
      return c.json(
        { error: "internal_error", message: "Failed to process IPN." },
        500
      );
    }
  }
);

// ─── 404 + error handling ────────────────────────────────

app.notFound((c) =>
  c.json(
    {
      error: "not_found",
      message: `No route matches ${c.req.method} ${c.req.path}.`,
      correlationId: c.get("correlationId")
    },
    404
  )
);

app.onError((err, c) => {
  console.error("[TRIANGULATE_API_ERROR]", err);
  return c.json(
    {
      error: "internal_error",
      message: "Unhandled exception. The error has been logged.",
      correlationId: c.get("correlationId")
    },
    500
  );
});

// ─── Startup ─────────────────────────────────────────────

const port = Number(process.env.PORT ?? 8080);

async function startup() {
  // Try to connect to DB and run migrations
  const dbConnected = await checkConnection();
  if (dbConnected) {
    console.log("[TRIANGULATE_API] Database connected. Running migrations...");
    try {
      await migrate();
    } catch (err) {
      console.error("[TRIANGULATE_API] Migration error (continuing anyway):", err);
    }
  } else {
    console.warn("[TRIANGULATE_API] No database connection. Auth and credit ledger will return errors.");
  }

  console.log(`[TRIANGULATE_API] listening on 0.0.0.0:${port}`);

  // Start batch worker (Phase 4)
  const { mkdirSync } = await import("node:fs");
  const batchDir = process.env.BATCH_STORAGE_DIR ?? "/data/batch";
  mkdirSync(batchDir, { recursive: true });
  startBatchWorker();
}

startup();

export default {
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0"
};

// ─── Helpers ─────────────────────────────────────────────

function makeCorrelationId() {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let out = "";
  const ts = Date.now().toString(36).toUpperCase().padStart(10, "0");
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${ts}${out}`;
}

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "proton.me", "protonmail.com", "icloud.com", "me.com",
  "aol.com", "mail.com", "gmx.com", "gmx.de", "live.com",
  "msn.com", "yandex.com", "yandex.ru", "qq.com", "163.com",
  "126.com", "yeah.net", "naver.com", "daum.net"
]);

function isFreeMail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return FREE_MAIL_DOMAINS.has(domain);
}

const EU_TLDS = new Set([
  "de", "fr", "uk", "it", "es", "nl", "be", "se", "dk", "fi",
  "pt", "at", "ie", "gr", "cz", "ro", "hu", "pl", "bg", "hr",
  "sk", "si", "lt", "lv", "ee", "mt", "cy", "lu"
]);

function isEUDomain(emailOrDomain: string): boolean {
  const tld = emailOrDomain.split(".").pop()?.toLowerCase()?.trim();
  return tld ? EU_TLDS.has(tld) : false;
}

function domainFromEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const at = email.lastIndexOf("@");
  if (at < 0) return undefined;
  return email.slice(at + 1).toLowerCase();
}

function responseShapeFromData(data: Record<string, unknown>): string {
  const shapes: string[] = [];
  if (data.person) shapes.push("person");
  if (data.company) shapes.push("company");
  if (data.technographics) shapes.push("technographics");
  if (data.intent) shapes.push("intent");
  if (data.contactTriangulation) shapes.push("contact");
  return shapes.join(",") || "none";
}

function responseShapeFromResponse(resp: Record<string, unknown>): string {
  const shapes: string[] = [];
  if (resp.person) shapes.push("person");
  if (resp.company) shapes.push("company");
  if (resp.technographics) shapes.push("technographics");
  if (resp.intent) shapes.push("intent");
  if (resp.contactTriangulation) shapes.push("contact");
  return shapes.join(",") || "none";
}
