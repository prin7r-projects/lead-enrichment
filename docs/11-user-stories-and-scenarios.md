# 11 — User stories and scenarios

This is the input contract for downstream implementation work. Every story below maps to at least one API endpoint specified in `12-technical-specification.md` and at least one Phase in `13-implementation-plan.md`. No orphan stories, no orphan endpoints.

> **Brand reminder.** Triangulate is API-first lead enrichment with source-linked confidence scoring. The visual idiom is Stripe-blueprint platinum-white; the payment processor is **NOWPayments only** (USDT-TRC20 / USDC-Polygon / USDC-ERC20). There is no Stripe billing integration in this product — Stripe is the *visual reference*, not the *processor*.

---

## 1. Personas summary

The deep dive lives in `05-audience-profile.md`. Three personas drive the stories below; the brief from the orchestrator named "RevOps engineer, SDR manager, growth hacker," but our canonical anti-persona explicitly excludes the bulk-list-buyer SDR manager (Tom B. in doc 05). We therefore translate the third persona to **CRM Integrator / Growth Engineer** — the engineer-shaped buyer who wires the API into a CRM, marketing automation, or warehouse pipeline. SDR managers are still served indirectly via the RevOps Engineer they report into.

### P1 — RevOps Engineer (primary)
Mehdi K. archetype (doc 05 §Persona A). Senior backend engineer on a "RevOps Engineering" team at a Series B (50–500 employees, $5M–$80M ARR). Lives in Postman, terminal, Datadog, Hightouch, dbt, Cloudflare Workers. Discretionary card up to $10k; $5k self-serve threshold. Earns trust through P95 latency, coverage %, real curl examples, source URLs, and a published refund policy. Buys Starter ($49) on day-zero, upgrades to Team ($399) by day 5, evaluates Scale ($2,499) at month 3.

### P2 — Founder-operator (secondary)
Hannah O. archetype (doc 05 §Persona B). Founding GTM operator, 12-person seed startup, the entire RevOps function. SQL-fluent, Python-curious, doesn't ship code daily but can. Buys via the homepage pricing card without a sales call. Volume stays under 1,000 credits/month — the entire Starter pack — through her first year. Champions the product inside founder Slacks/WhatsApp groups.

### P3 — CRM Integrator / Growth Engineer (tertiary, growth-loop)
The engineer at a 30–150-person company who owns the marketing-or-CRM-automation surface (HubSpot, Salesforce, Customer.io, Segment) and is asked to "make our enrichment less garbage." They consume Triangulate via the **webhook-fired** integration path (see Scenario S3): a CRM record-create event hits a serverless function, which calls `POST /v1/enrich`, which writes the response back via the CRM's REST API. Volume is uneven — bursty around campaigns, otherwise quiet. Buys at Team ($399) and stays there for 6+ months.

---

## 2. Primary user stories

8–12 stories covering the core product loop end-to-end. Format: `As a <persona>, I want to <action>, so that <outcome>`.

### S1 — Discovery & schema verification
**As a** RevOps Engineer (P1), **I want to** see the exact JSON response shape on the public landing page **so that** I can decide in under 5 minutes whether the schema covers my outbound use case without booking a demo.
- *Maps to:* doc 12 §3 `GET /v1/coverage`; landing `components/api-section.tsx`, `components/coverage-matrix.tsx`.

### S2 — First curl from terminal
**As a** RevOps Engineer (P1), **I want to** run a real `curl` against `POST /v1/enrich` within 5 minutes of paying **so that** I can verify the API's latency and field coverage match what the landing claims.
- *Maps to:* doc 12 §3 `POST /v1/enrich`; doc 13 Phase 0 DoD.

### S3 — Webhook-fired enrichment from CRM
**As a** CRM Integrator (P3), **I want to** trigger enrichment from a HubSpot/Salesforce record-create webhook **so that** every new lead in the CRM is enriched within 5 seconds of creation, with the response written back to the same record.
- *Maps to:* doc 12 §3 `POST /v1/enrich`, §3 webhook callback semantics; doc 13 Phase 3.

### S4 — Bulk CSV via dashboard
**As a** RevOps Engineer (P1), **I want to** upload a CSV of 5,000 leads through the dashboard and receive an enriched CSV back via email **so that** my GTM team can do a one-shot list refresh without writing a Cloudflare Worker.
- *Maps to:* doc 12 §3 `POST /v1/enrich/batch`, `GET /v1/jobs/:id`; doc 13 Phase 4 (batch worker).

### S5 — Buy a credit pack
**As a** Founder-operator (P2), **I want to** buy the Starter pack ($49) directly from the homepage **so that** I can start enriching the same day without a sales call, an annual contract, or a credit card on file.
- *Maps to:* landing `/api/checkout/nowpayments` → NOWPayments hosted invoice → IPN → credit ledger.

### S6 — Receive API key after first credit-pack purchase
**As a** Founder-operator (P2), **I want to** receive my API key by email within 60 seconds of paying my NOWPayments invoice **so that** I don't have to chase support and can copy a working curl into my terminal immediately.
- *Maps to:* doc 12 §3 NOWPayments IPN; doc 13 Phase 2 (auth + key issuance).

### S7 — Inspect remaining credits + recent usage
**As a** RevOps Engineer (P1), **I want to** call `GET /v1/credits` (and see the same number on the dashboard) **so that** I can graph credit burn-rate against my outbound campaign cadence.
- *Maps to:* doc 12 §3 `GET /v1/credits`.

### S8 — Interpret a confidence score
**As a** RevOps Engineer (P1), **I want to** see a per-field confidence score AND at least one source URL per response **so that** my team can manually audit any field below a threshold instead of treating every record as 1.0.
- *Maps to:* doc 12 §2 (response schema), doc 02 §Response schema.

### S9 — Handle a `not_match` cleanly
**As a** Founder-operator (P2), **I want to** receive `not_match` instead of a guessed value when the source layer cannot triangulate **so that** I can trust the rest of the data and route the unmatched row to a manual queue.
- *Maps to:* doc 12 §3 response shape, doc 11 §4 ES1 (ambiguous email).

### S10 — Upgrade Starter → Team
**As a** RevOps Engineer (P1), **I want to** see a header banner when I cross 700 credits remaining (70% consumed) on Starter **so that** I can buy the Team pack before I hit zero and break my pipeline.
- *Maps to:* doc 12 §3 `GET /v1/credits`, dashboard nudge component; doc 13 Phase 5.

### S11 — Cache hit for repeat lookups
**As a** CRM Integrator (P3), **I want to** repeat-call `POST /v1/enrich` for the same lead within 28 days and have the cache return the same response without consuming a credit **so that** my retry loops and idempotency-key replays don't bankrupt my credit balance.
- *Maps to:* doc 12 §3 cache semantics; doc 02 §Data flow steps 4 + 7.

### S12 — Refund unused credits
**As a** Founder-operator (P2), **I want to** request a prorated refund of unused credits within 30 days of purchase **so that** I can de-risk my evaluation without committing $49 for data I might not use.
- *Maps to:* doc 12 §3 refund admin endpoint (manual, founder-handled in Wave 2); doc 07 §Refund policy.

---

## 3. Main scenarios (happy paths)

Six narrative walkthroughs. Each scenario names the surface (landing section, API endpoint, external integration) so implementation can instrument every step.

### Scenario M1 — Single-lookup via API (developer)
**Persona.** P1 (RevOps Engineer).
**Trigger.** Engineer reads a Hacker News thread linking Triangulate. Lands on the homepage hero.

**Steps.**
1. Engineer reads the hero `curl` block. Frontend: `apps/landing/components/hero.tsx`. No backend call.
2. Scrolls to "Coverage matrix" — confirms `intent.hiring` and `contactTriangulation.emailDeliverability` are in scope. Frontend: `apps/landing/components/coverage-matrix.tsx` consumes the static `GET /v1/coverage` response shape.
3. Clicks "Get API key" in header → scrolls to Pricing. Frontend: `apps/landing/components/pricing.tsx`.
4. Clicks "Pay with crypto" on the Starter card → backend `POST /api/checkout/nowpayments` with `{ packId: "starter" }`. Backend creates NOWPayments invoice via `POST https://api.nowpayments.io/v1/invoice` and returns `{ invoiceUrl, orderId }`.
5. Engineer redirected to NOWPayments hosted invoice. Pays $49 in USDT-TRC20.
6. NOWPayments fires `POST /api/webhooks/nowpayments` IPN with HMAC-SHA512 signature. Backend verifies signature, persists paid-credit-pack event to credit ledger, dispatches API-key issuance.
7. Engineer receives email with API key + curl example. Backend: outbound transactional mail (Wave 2: founder hand-delivery; Wave 3: SES/Resend automation).
8. Engineer runs the curl from terminal → `POST /v1/enrich` with `{ email: "..." }` and `Authorization: Bearer <key>`. API: `apps/api/src/index.ts` + `enrich.ts` returns the deterministic-stub response in 20–80ms (stub) / <1.5s (Wave 3 source-layer).
9. Engineer runs the same curl 5 more times → first 5 burn 5 credits; 6th hits cache (28-day TTL on `sha256(domain + name)`) → returns identical response with `cached: true`, no credit burn.

**Success criteria.**
- First-curl time from "land on homepage" to "200 OK with valid response" < 30 minutes.
- Engineer's first 6-call sequence consumes 5 credits, not 6.
- Response shape exactly matches the landing's documented schema (no extra fields, no missing fields).

**Frontend touch-points.** `hero.tsx`, `coverage-matrix.tsx`, `pricing.tsx`, `api-section.tsx`, `proof-row.tsx`.
**Backend touch-points.** `POST /api/checkout/nowpayments` (landing), `POST /api/webhooks/nowpayments` (landing), `POST /v1/enrich` (api), email dispatch.
**External.** NOWPayments hosted invoice, NOWPayments IPN, transactional mail provider.

---

### Scenario M2 — Bulk CSV via dashboard (RevOps)
**Persona.** P1 (RevOps Engineer) using the dashboard surface (Wave 3+ — Wave 2 ships the API path only).
**Trigger.** Engineer has a 5,000-row CSV from a niche industry directory and wants every row enriched in under 10 minutes.

**Steps.**
1. Engineer signs into dashboard at `https://lead-enrichment.prin7r.com/app` via email magic-link (doc 12 §6).
2. Drags `leads.csv` onto the upload zone. Frontend uploads multipart to `POST /v1/enrich/batch`. Backend: API stores the CSV in object storage (Contabo S3-compat), creates an `EnrichmentJob` row with `status: queued`, returns `{ jobId, estimatedCredits: 5000, estimatedDurationSec: 540 }`.
3. Engineer sees a progress page polling `GET /v1/jobs/:id` every 2s. Backend: worker process drains the job, fanning out to `enrich()` per row at 50 RPS internally to honor the source-layer fan-out's per-source budget.
4. Worker emits per-row results to a per-job file in object storage as it completes.
5. On `status: completed`, the dashboard shows a download link. Backend: presigned URL to the result CSV (15-minute TTL).
6. Engineer downloads `leads-enriched.csv` with all 5,000 rows + per-field confidence + source URLs.
7. Worker also fires the customer's registered batch-completion webhook (if any) per S3 — `POST <customer_url>` with `{ jobId, status, downloadUrl }`.

**Success criteria.**
- 5,000 rows enriched in under 10 minutes wall-clock (P95 budget; doc 12 §9).
- 5,000 credits consumed (1 per non-cached, non-`not_match` row); cached rows do not burn credits.
- Result CSV preserves original column order; appends Triangulate columns prefixed `triangulate.*`.

**Frontend touch-points.** Dashboard upload zone, progress card, download CTA.
**Backend touch-points.** `POST /v1/enrich/batch`, `GET /v1/jobs/:id`, batch worker, object storage, webhook dispatcher.
**External.** Contabo S3-compat storage; customer-registered webhook URL.

---

### Scenario M3 — Webhook-fired enrichment from CRM (integrator)
**Persona.** P3 (CRM Integrator / Growth Engineer).
**Trigger.** A new lead is created in HubSpot. HubSpot fires its `contact.creation` webhook to the customer's serverless function.

**Steps.**
1. Customer's Cloudflare Worker / Vercel Edge Function receives the HubSpot webhook.
2. Worker calls `POST /v1/enrich` with `{ email: contact.email }` and `Authorization: Bearer <key>`. Round-trip target: <1.5s P95.
3. API enriches synchronously, decrements credit balance by 1, returns full response with confidence + sources.
4. Worker maps Triangulate fields into HubSpot custom properties (`title`, `company.fundingStage`, `intent.hiring.openRoles`, `meta.freshness.ageDays`).
5. Worker calls `PATCH https://api.hubapi.com/crm/v3/objects/contacts/{id}` to write the enriched fields back. Source URLs are stored in a `triangulate_sources` long-text property as JSON.
6. HubSpot record now shows enriched data within 2–3 seconds of creation.

**Success criteria.**
- End-to-end latency (HubSpot webhook fire → HubSpot record updated) < 5s P95.
- Enrichment writes are idempotent — replaying the HubSpot webhook does not double-charge credits (cache hit on second call).
- HubSpot custom-property writes succeed even when partial enrichment results land (e.g. `intent` slice failed but `company` succeeded).

**Frontend touch-points.** None (server-to-server). The customer's dashboard view of enriched fields is the HubSpot UI itself.
**Backend touch-points.** `POST /v1/enrich`, credit ledger decrement, cache hit/miss logging.
**External.** HubSpot CRM, customer's serverless function.

---

### Scenario M4 — Credit-pack purchase + first credit consumed
**Persona.** P2 (Founder-operator).
**Trigger.** Reads a SaaStr blog post linking Triangulate; lands on `#pricing` deep-link.

**Steps.**
1. Hannah hits the Pricing section. Compares Starter ($49 / 1k) to Apollo's per-seat quote.
2. Clicks "Pay with crypto" on Starter. Frontend: `pricing.tsx` → `POST /api/checkout/nowpayments` with `{ packId: "starter" }`.
3. Landing API hits NOWPayments, gets back `invoice_url + order_id`, redirects.
4. Hannah pays $49 in USDC-Polygon via her Phantom wallet on the NOWPayments page.
5. NOWPayments confirms payment on-chain (typical: 30–60s for Polygon), fires IPN.
6. Landing API verifies HMAC-SHA512 of `JSON.stringify(sortObject(payload))` with the `IPN_SECRET`. Persists `Payment` row + credits the customer's `CreditAccount` with 1,000 credits.
7. API issuance: backend generates a 32-byte secret-scoped API key (`tri_live_<ulid>_<base32rand>`), stores `sha256(key)` in DB, never the raw key.
8. Email dispatch: Hannah receives `api-key-issued.html` with raw key (shown once), curl example, and dashboard link.
9. Hannah copies the curl, runs it. First credit consumed. `meta.creditsRemaining: 999`.

**Success criteria.**
- IPN-to-API-key-email latency < 60s P95.
- Raw API key shown to user exactly once (in the email); only `sha256(key)` persists in DB.
- `Payment` row links 1:1 to `CreditTransaction` row crediting the account; both committed in a single DB transaction.

**Frontend touch-points.** `pricing.tsx`, NOWPayments hosted invoice (external), email template.
**Backend touch-points.** `POST /api/checkout/nowpayments`, `POST /api/webhooks/nowpayments`, credit ledger, key issuance, mail provider.
**External.** NOWPayments invoice + IPN; mail provider (Resend / SES).

---

### Scenario M5 — Confidence-score interpretation flow
**Persona.** P1 (RevOps Engineer) writing a downstream audit dashboard.
**Trigger.** Engineer enriched 1,000 leads via batch (M2). Now wants to flag every record with any field below `confidence < 0.85` for manual review.

**Steps.**
1. Engineer downloads the enriched CSV from M2.
2. Loads it into Snowflake / dbt / BigQuery via Hightouch reverse ETL.
3. Writes a SQL view: `SELECT * FROM enriched_leads WHERE LEAST(person_title_confidence, person_fullname_confidence) < 0.85`.
4. Builds a Looker dashboard showing per-field confidence distribution and the share of rows that fall below threshold per source.
5. For any flagged row, the team clicks the source URL stored in `triangulate.person.title.sources[0]` and verifies (or rejects) the enrichment manually.
6. Aggregate view: dashboard shows that 12% of records fall below 0.85 on `person.title`, but only 4% on `company.industry` — the team trusts industry but audits titles.

**Success criteria.**
- Every field returned by the API includes both a `confidence` (0.0–1.0) AND at least one `sources[]` URL when a value was returned.
- `not_match` results are explicit (separate `status: "not_attempted"` or null value), never a guessed value with low confidence pretending to be a real result.
- The schema used in M5 matches the landing's documented schema 1:1 — no shape drift between `02-architecture.md`, `enrich.ts`, and the actual returned JSON.

**Frontend touch-points.** None inside Triangulate — the customer's own BI/data tooling.
**Backend touch-points.** `POST /v1/enrich/batch` result CSV format; per-field confidence/sources contract.
**External.** Customer's data warehouse, reverse-ETL, BI tool.

---

### Scenario M6 — Founder pilot (free 50 credits → first paid pack)
**Persona.** P2 (Founder-operator); founder-led sales-assist motion.
**Trigger.** Hannah sends `mailto:founder@triangulate.dev` asking for a no-card pilot.

**Steps.**
1. Founder receives email, replies within 4 hours during business hours (per doc 07 §Sales playbook).
2. Founder issues a 50-credit pilot key manually via the admin CLI: `bun apps/api/src/admin/issue-key.ts --email <hannah@...> --credits 50 --label "pilot-sj-2026-05"`.
3. Admin script writes a `Customer` + `CreditAccount` + `ApiKey` row, dispatches a personal-style email with the key.
4. Hannah runs 50 enrichments over 14 days. 49 return verified; 1 returns `not_match` — she trusts the honesty.
5. On day 14, founder follows up: "What did the trial show?" Hannah replies positively.
6. Founder sends her the Starter pack purchase link. She buys $49 via NOWPayments → falls through to M4 from step 3 onward.

**Success criteria.**
- Pilot key works identically to a paid key — same `POST /v1/enrich` endpoint, same response shape, same rate-limit budget at the Starter tier.
- Pilot credits do not auto-renew; expire silently when consumed.
- Manual key issuance is fully observable: every admin issuance is logged with operator email + timestamp + reason.

**Frontend touch-points.** Email (founder's inbox), eventual `pricing.tsx`.
**Backend touch-points.** Admin CLI, `Customer`/`CreditAccount`/`ApiKey` writes.
**External.** Founder's email client (manual reply); NOWPayments (downstream).

---

## 4. Edge case scenarios

Six narratives covering input edge cases, failure modes, partial-result handling, billing edge cases.

### ES1 — Ambiguous email (multiple matches)
**Trigger.** `POST /v1/enrich { email: "j.smith@stripe.com" }` where Stripe employs three `j.smith` addresses (Jane, Jack, Jordan).
**Behavior.** Source layer returns 3 candidate matches with overlapping confidence (0.78 / 0.74 / 0.71). Triangulate's resolver picks the *most recent* signal source (latest LinkedIn update wins) and returns ONE result with `meta.disambiguation: { candidates: 3, strategy: "most_recent_source" }`. Confidence is dropped one band (max 0.78).
**System response.** 200 OK; `meta.disambiguation` warns the consumer; `confidence` is honest about the ambiguity. Never returns 3 results in one response.
**DoD.** Test fixture covers this case; `enrich()` returns `meta.disambiguation` only when ≥2 candidates exist within 0.10 confidence of each other.

### ES2 — Domain-only, no email
**Trigger.** `POST /v1/enrich { domain: "newco.io" }` where the domain has no findable decision-maker in public sources.
**Behavior.** `company.*` slice populates fully (firmographics from SEC EDGAR / Crunchbase / Common Crawl). `person` is `null`. `contactTriangulation.emailDeliverability` is `{ status: "not_attempted" }`.
**System response.** 200 OK; `person: null`; the credit IS still consumed (we did real work even when the person slice was empty).
**Why charge.** The customer chose to send a domain-only request; they got firmographic data they couldn't get from a free WHOIS lookup.
**DoD.** Documented in landing FAQ ("What does a domain-only request return?"); explicitly tested in `enrich.test.ts`.

### ES3 — GDPR-restricted region
**Trigger.** `POST /v1/enrich { email: "person@example.de" }` (German domain, EU-resident likely).
**Behavior.** Triangulate returns firmographics + technographics + intent (all corporate, non-personal data). The `person` slice returns name + role-level title only (no city, no department, no LinkedIn URL — the slice is *role-anonymized*). `contactTriangulation` returns SMTP-echo validity but no contact-pattern beyond what the customer supplied.
**System response.** 200 OK with `meta.regionPolicy: "EU-restricted"` annotation.
**Anti-behavior.** Triangulate never returns home addresses, mobile numbers, or biographical data for any region — but EU rows are doubly-trimmed.
**DoD.** Test fixture per region (.de, .fr, .uk, .se, .it); `meta.regionPolicy` field is part of the documented schema; doc 07 GDPR objection-handling answer matches this behavior.

### ES4 — Rate-limit hit
**Trigger.** Customer on Starter tier (configured at 50 RPS) sends 200 RPS for 30 seconds.
**Behavior.** First 50 RPS pass; subsequent requests return `429 Too Many Requests` with `Retry-After: <seconds>` header and `{ error: "rate_limited", limit: 50, window: "1s", retryAfterMs: <ms> }` body. No credits consumed for 429s.
**Per-tier limits.** Starter: 50 RPS / 1 RPS sustained 24h. Team: 250 RPS / 5 RPS sustained. Scale: contractually per-MSA.
**Tracking.** Rate-limit decisions logged with correlationId for debugging.
**DoD.** Token-bucket rate-limiter at the API edge (Hono middleware); 429 response shape covered by `index.test.ts`; per-tier limits configurable via env.

### ES5 — Source-disagreement (LinkedIn vs Crunchbase conflict)
**Trigger.** Crunchbase says `company.fundingStage = "Series B"` but LinkedIn job posts mention "Series C announcement". Source-layer fan-out captures both signals.
**Behavior.** Resolver picks the *most recent* signal (LinkedIn job posts dated 2026-05-01 > Crunchbase last-modified 2025-11-12) and returns `Series C` with `confidence: 0.78` (one band lower than the un-conflicted case) plus `meta.sourceDisagreement: { field: "company.fundingStage", picked: "linkedin_jobposts", overruled: "crunchbase" }`.
**Anti-behavior.** Triangulate never silently averages or hides the conflict. The customer can re-derive the conflicting signals from the stored source artifacts (Wave 4 feature: `GET /v1/enrich/:id/sources/raw`).
**DoD.** `meta.sourceDisagreement` shape documented in `02-architecture.md` and reflected in the response schema; resolver tested against a fixture where Crunchbase + LinkedIn disagree.

### ES6 — Failed payment / refund request
**Trigger.** Customer disputes a $49 Starter purchase on day 8 because they realized their team already pays for Apollo. They email founder@triangulate.dev with the order ID.
**Behavior.** Founder runs admin CLI: `bun apps/api/src/admin/refund.ts --orderId <id> --reason "Wave 2 manual refund within 30d window"`. Script:
1. Looks up `Payment` row + linked `CreditAccount`.
2. Computes prorated refund: `(unusedCredits / totalCredits) * priceUsd`.
3. Initiates NOWPayments refund via their API (Wave 2 path: founder manually returns USDT to the customer's payout address; Wave 3 automates).
4. Marks `CreditAccount.status = "refunded"`; remaining credits revoked.
5. Writes `Refund` row linking back to `Payment`.
**System response.** Customer receives confirmation email within 24h. Their API key continues to work for the next API call but returns `402 Payment Required` once the credit-account is revoked.
**DoD.** Refund flow tested end-to-end with a synthetic NOWPayments sandbox order; `Refund` table + audit trail; refund button in dashboard (Wave 3).

---

## 5. Anti-scenarios

Five things the product explicitly does NOT support. Implementers must not build these accidentally.

### A1 — We do not sell B2C / personal contact data
**Excluded.** No personal-email enrichment of `gmail.com`, `yahoo.com`, `proton.me`, etc., except where the local-part itself is a clearly-corporate alias (e.g. a contractor invoicing under their personal email). No mobile phone numbers. No home addresses. No demographic / lifestyle attributes.
**Why.** Per doc 07 §Anti-persona Tom B. and the GDPR objection-handling answer, our position is that we enrich **business contexts**, not personal ones. Selling personal contact data is what makes Apollo's bulk SKU regulatorily exposed; we will not be next to them in a future enforcement action.
**Implementer rule.** If a request comes in for a free-mail domain, the API returns `person: null` and `meta.policy: "personal_email_excluded"`. No credit is consumed. (This is the *one* class of request that refunds the credit because we explicitly chose not to fulfill it.)

### A2 — We do not scrape gated platforms
**Excluded.** We do not log into LinkedIn to scrape behind the auth wall. We do not use cookies stolen from logged-in users. We do not run browser automation against any platform that prohibits it in their TOS. No GitHub-scraping of private contributors. No Crunchbase paid-tier scraping.
**Allowed.** Public LinkedIn pages (the un-authed view), public GitHub commits, SEC EDGAR filings, Companies House filings, Common Crawl indexes, public news APIs, public job-board RSS, BuiltWith-style HTML header probes.
**Implementer rule.** Every source connector ships with a one-line legal posture in its module docstring (e.g. "scrapes public unauthed LinkedIn profile pages — robots.txt-respecting"). Adding a new source requires a checklist review.

### A3 — We do not store PII beyond 90 days
**Retention rule.** Enrichment results stored in cache for 28 days (firmographic), 14 days (decision-maker), 7 days (technographic), 24 hours (intent). Cache evictions are *strict* — a key that ages out of cache is fully deleted, not soft-deleted. **Beyond 90 days from last access, no PII row may persist**, except: (a) anonymized aggregate counts for coverage methodology (no per-record fields), (b) audit logs of who-asked-for-whom (the customer's own request logs).
**Customer ledger data is exempt** because it's the customer's own contract data (their email, their payments, their credit balance), not third-party PII.
**Implementer rule.** Cron job `purge-expired-pii` runs nightly at 03:00 UTC; deletes any `EnrichmentResult` row older than its tier's TTL; emits a metric for compliance auditing.

### A4 — We do not run a UI for enriched data
**Excluded.** We do not build a "view your enriched contacts in our dashboard" feature. We do not build email-blast tooling. We do not build an in-product CRM. We do not build a sales-engagement workflow.
**The dashboard exists only to** (a) show credit balance + recent usage, (b) upload bulk CSV jobs, (c) manage API keys + webhooks, (d) view + download invoices.
**Why.** Per doc 04 §P9, our wedge against Apollo / ZoomInfo is exactly *not* having a UI lock-in. The data lives in the customer's warehouse / CRM / spreadsheet — not in ours.

### A5 — We do not send email from Triangulate accounts
**Excluded.** We do not send outbound campaigns. We do not provide warmup. We do not provide deliverability analytics on behalf of our customers' own SMTP. We do not act as a sender on the customer's behalf.
**Allowed.** Transactional mail FROM `noreply@triangulate.dev` to OUR customers (welcome email with API key, credit-balance nudges, refund confirmations). That's the entire scope of our outbound mail.
**Implementer rule.** No `POST /v1/send` endpoint exists. Any feature that touches a customer's domain reputation is out of scope; we send their data, not their messages.

---

## 6. Cross-doc traceability matrix

Every story above is mapped to its API contract (doc 12) and implementation phase (doc 13). A reviewer should be able to follow any row left-to-right without finding a dangling endpoint or unimplemented story.

| Story | Endpoint | Phase | Frontend |
| --- | --- | --- | --- |
| S1 | `GET /v1/coverage` | Phase 0 | `coverage-matrix.tsx` |
| S2 | `POST /v1/enrich` | Phase 0 | `api-section.tsx` |
| S3 | `POST /v1/enrich` | Phase 3 | none (server-to-server) |
| S4 | `POST /v1/enrich/batch`, `GET /v1/jobs/:id` | Phase 4 | dashboard (Wave 3+) |
| S5 | `POST /api/checkout/nowpayments` | Phase 1 | `pricing.tsx` |
| S6 | `POST /api/webhooks/nowpayments` | Phase 2 | email template |
| S7 | `GET /v1/credits` | Phase 2 | dashboard credit card |
| S8 | response schema | Phase 0 | `api-section.tsx` |
| S9 | response schema | Phase 0 | none (data shape) |
| S10 | `GET /v1/credits` + nudge | Phase 5 | dashboard banner |
| S11 | `POST /v1/enrich` cache-key semantics | Phase 1 | none |
| S12 | admin `POST /admin/refund` (Wave 2: CLI; Wave 3: dashboard) | Phase 6 | dashboard refund button |

---

## 7. Open questions for downstream implementation

These are not blockers for Phase 0; flag them when entering Phase 2.

- **Email provider.** Wave 2 ships founder-hand-delivery. Wave 3 needs Resend or SES — pick one before Phase 2 DoD.
- **Dashboard auth.** Magic-link is the playbook default. Confirm that `apps/dashboard` (Wave 3) ships a magic-link flow rather than OAuth-with-Google before Phase 2.
- **Webhook signatures (outbound).** When we fire batch-completion webhooks back to customers (S3), do we sign with HMAC-SHA512 like NOWPayments does to us? Default: yes. Confirm before Phase 4.
- **`not_match` credit policy.** Today's stub charges 1 credit even for `not_match`. Should `not_match` be free? Decision pending — see S9; default is to charge because we still did source-fan-out work. Override only if a top-3 customer requests it pre-launch.
