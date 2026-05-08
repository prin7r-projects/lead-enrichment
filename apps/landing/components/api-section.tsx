import { CodeSample } from "@/components/code-sample";

const AUTH_TAB = `# 1. Buy a credit pack on the pricing page below.
# 2. Receive your API key by email.
# 3. Send the key as a Bearer token. Done.

curl https://lead-enrichment.prin7r.com/healthz
# -> { "status": "ok", "service": "triangulate-api", ... }

curl -H "authorization: Bearer YOUR_KEY" \\
  -X POST https://lead-enrichment.prin7r.com/v1/enrich \\
  -H "content-type: application/json" \\
  -d '{"email":"jane.doe@stripe.com"}'`;

const SINGLE_REQUEST = `# Single enrichment — one credit consumed on cache miss.
# Cache hits return < 50ms and consume 0 credits.

curl -X POST https://lead-enrichment.prin7r.com/v1/enrich \\
  -H "authorization: Bearer YOUR_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "email": "jane.doe@stripe.com",
    "domain": "stripe.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "company": "Stripe"
  }'`;

const SINGLE_RESPONSE = `{
  "request": {
    "input": { "email": "jane.doe@stripe.com" },
    "correlationId": "01HYZ7C3...",
    "ts": 1715212800000,
    "latencyMs": 720,
    "cached": false
  },
  "person": {
    "fullName": { "value": "Jane Doe", "confidence": 0.97, "sources": [...] },
    "title":    { "value": "Engineering Manager, Payments", "confidence": 0.94 },
    "department": { "value": "Engineering", "confidence": 0.95 },
    "location": { "value": { "city": "San Francisco", "country": "US" }, "confidence": 0.86 }
  },
  "company": { /* domain, name, industry, employeeCount, hqLocation, fundingStage */ },
  "technographics": [ { "category": "CDN", "vendor": "Cloudflare", "confidence": 0.98 } ],
  "intent": { "hiring": { "openRoles": 142 }, "newsMentions7d": 8 },
  "contactTriangulation": { "emailDeliverability": { "status": "valid", "confidence": 0.92 } },
  "meta": {
    "freshness": { "ageDays": 3, "refreshedAt": "2026-05-05T08:00:00Z" },
    "creditsRemaining": 9873
  }
}`;

const WEBHOOK_SAMPLE = `// Optional: register a webhook to receive batch completions.
// We POST a signed event when a bulk job finishes.

import crypto from "node:crypto";

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-triangulate-signature") ?? "";
  const expected = crypto
    .createHmac("sha256", process.env.TRIANGULATE_WEBHOOK_SECRET!)
    .update(raw)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(raw); // { type, batchId, completedAt, results: [...] }
  await persist(event);
  return new Response("ok");
}`;

export function ApiSection() {
  return (
    <section
      id="api"
      className="border-b border-border bg-porcelain"
      aria-labelledby="api-heading"
    >
      <div className="container py-24 md:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <span className="eyebrow">Drop-in API</span>
            <h2
              id="api-heading"
              className="mt-4 display text-[clamp(2rem,4vw,2.75rem)] leading-[1.1] text-midnight"
            >
              No portal. No OAuth. Five-line first integration.
            </h2>
            <p className="mt-5 text-[15px] text-slate leading-[1.55]">
              The schema below is the same JSON the production endpoint returns. Pin our
              version header (
              <span className="font-mono text-midnight text-[13px]">
                X-Triangulate-Version: 2026-05
              </span>
              ) when you're ready to lock it down.
            </p>
            <ul className="mt-7 flex flex-col gap-3 text-[14px] text-slate">
              <li className="flex gap-2">
                <span className="text-violet font-mono">→</span> Stable JSON schema, semver-pinned.
              </li>
              <li className="flex gap-2">
                <span className="text-violet font-mono">→</span> Deterministic responses on identical input.
              </li>
              <li className="flex gap-2">
                <span className="text-violet font-mono">→</span> Cache hits don't consume credits.
              </li>
              <li className="flex gap-2">
                <span className="text-violet font-mono">→</span> Correlation id on every response.
              </li>
            </ul>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-10">
            <div>
              <h3 className="mb-3 eyebrow text-violet">01 · Authentication</h3>
              <CodeSample
                ariaLabel="Authentication code samples"
                tabs={[{ value: "auth", label: "cURL", language: "bash", source: AUTH_TAB }]}
              />
            </div>

            <div>
              <h3 className="mb-3 eyebrow text-violet">02 · Single enrichment</h3>
              <CodeSample
                ariaLabel="Single enrichment request and response"
                tabs={[
                  { value: "req", label: "Request", language: "bash", source: SINGLE_REQUEST },
                  { value: "res", label: "Response", language: "json", source: SINGLE_RESPONSE }
                ]}
              />
            </div>

            <div>
              <h3 className="mb-3 eyebrow text-violet">03 · Webhook callback (optional)</h3>
              <CodeSample
                ariaLabel="Webhook callback handler"
                tabs={[{ value: "wh", label: "Node / Bun", language: "ts", source: WEBHOOK_SAMPLE }]}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
