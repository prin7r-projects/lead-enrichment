/**
 * Triangulate API — Hono + Bun server.
 *
 * Phase 1: Real auth, credit ledger, rate limiting, caching,
 * NOWPayments IPN → credits, GDPR region policy, free-mail exclusion.
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
import { checkConnection } from "./db/client.js";

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
    version: "0.2.0",
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
    company: z.string().min(1).max(200).optional()
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
            ...((cached.data as Record<string, unknown>).meta as Record<string, unknown> ?? {}),
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
      intent: { intent: response.intent }
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
