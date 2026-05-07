import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { enrich } from "./enrich.js";

type Variables = {
  correlationId: string;
  apiKey: string;
};

const app = new Hono<{ Variables: Variables }>();

// Always JSON; never HTML 500s.
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["authorization", "content-type", "x-request-id"],
    exposeHeaders: ["x-triangulate-correlation-id"],
    maxAge: 86400
  })
);

// Correlation id middleware.
app.use("*", async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const correlationId = incoming || makeCorrelationId();
  c.set("correlationId", correlationId);
  c.header("x-triangulate-correlation-id", correlationId);
  await next();
});

// Liveness — no auth.
app.get("/healthz", (c) =>
  c.json({
    status: "ok",
    service: "triangulate-api",
    version: "0.1.0",
    ts: Date.now()
  })
);

// Coverage meta — no auth.
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

// Bearer auth — strict for /v1/*.
app.use("/v1/*", async (c, next) => {
  if (c.req.path === "/v1/coverage") return next();

  const auth = c.req.header("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1].trim().length < 8) {
    return c.json(
      {
        error: "unauthorized",
        message: "Missing or malformed Authorization header. Expected: Bearer <api_key>.",
        correlationId: c.get("correlationId")
      },
      401
    );
  }
  c.set("apiKey", match[1].trim());
  await next();
});

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
      const correlationId = c.req.header("x-triangulate-correlation-id");
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
    const apiKey = c.get("apiKey");
    const response = await enrich({ input: body, correlationId, apiKey });
    return c.json(response, 200);
  }
);

// Catch-all 404 with shape.
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

const port = Number(process.env.PORT ?? 8080);
console.log(`[TRIANGULATE_API_BOOT] listening on 0.0.0.0:${port}`);

export default {
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0"
};

function makeCorrelationId() {
  // ULID-ish: timestamp + random base32-ish chunk.
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let out = "";
  const ts = Date.now().toString(36).toUpperCase().padStart(10, "0");
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${ts}${out}`;
}
