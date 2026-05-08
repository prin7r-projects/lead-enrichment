# 13 — Implementation Plan

> Phased delivery plan for Triangulate SaaS. Co-authored with doc/12. Every phase maps to stories from doc/11. Phases are incremental — each builds on the previous. Phase 0 is already deployed; Phase 1 begins now.

---

## Phase 0: Landing + API stub (DONE)

**Status**: ✅ Deployed to `https://lead-enrichment.prin7r.com`

**What shipped**:
- Next.js 15 landing with all sections (Hero, Coverage Matrix, Pricing, API Snippet, FAQ, Footer)
- NOWPayments checkout route (`POST /api/checkout/nowpayments`) — creates invoices, tested end-to-end
- NOWPayments IPN webhook (`POST /api/webhooks/nowpayments`) — verifies HMAC-SHA512, logs, ACKs (does not yet persist credits)
- Bun + Hono API with `GET /healthz`, `GET /v1/coverage`, `POST /v1/enrich` (deterministic stub)
- Bearer auth middleware (accepts any key ≥8 chars)
- Correlation ID middleware (ULID-based)
- Traefik routing with path-based service discrimination
- Docker Compose deployment on Prin7r VPS

**Stories covered**: S1, S2, S5 (checkout only, no IPN→credit), S8, S9

---

## Phase 1: Database + Auth + Credit Ledger + NOWPayments IPN (NOW)

**Goal**: Make the product sellable. A customer can pay, get an API key, run `POST /v1/enrich`, and see their credit balance decrement.

### Tasks

#### 1.1 PostgreSQL provisioning

- [ ] Add PostgreSQL 16 service to `docker-compose.yml`
- [ ] Create migration: all tables from doc/12 §6.1
- [ ] Add `DATABASE_URL` to `.env` and `.env.example`
- [ ] Create `apps/api/src/db/` module:
  - `client.ts` — `postgres` (or `pg`) connection pool
  - `migrate.ts` — run SQL migrations
  - Schema types (TypeScript interfaces matching DB rows)

**Verify**: `docker compose up -d postgres` → `bun run src/db/migrate.ts` creates all tables.

#### 1.2 Real auth middleware

- [ ] Replace any-key-accepted auth with DB-backed validation
- [ ] `apps/api/src/auth/`:
  - `middleware.ts` — validate `Authorization: Bearer <key>`, hash with sha256, lookup in `api_keys`
  - On valid: set `accountId`, `keyId`, `tier` in Hono context variables
  - On missing/invalid: return 401
  - On revoked/expired: return 401
  - On zero balance: return 402
- [ ] API key generation utility: `generateApiKey()` → `{ rawKey, prefix, hash }`

**Verify**: `curl -H "Authorization: Bearer invalid" /v1/credits` → 401; valid key → 200.

#### 1.3 Credit ledger

- [ ] `apps/api/src/ledger/`:
  - `creditAccount.ts` — CRUD for `credit_accounts`
  - `transactions.ts` — `consumeCredit()`, `grantCredits()`, `revokeCredits()`
  - `GET /v1/credits` endpoint — returns balance + recent usage (doc/12 §3.4)
- [ ] Credit consumption in `POST /v1/enrich`:
  - After successful enrichment, decrement balance by 1
  - Write `CreditTransaction` (type: `consume`)
  - Write `EnrichmentRequest` row
  - If cache hit: no credit consumed, mark `cached: true`
- [ ] Free-mail exclusion (A1): `meta.policy: "personal_email_excluded"` → no credit consumed

**Verify**: Enrich 5 times → balance decrements by 5. Cache hit on 6th → balance unchanged. Free-mail → no decrement.

#### 1.4 NOWPayments IPN → credit persistence

- [ ] Wire the existing IPN webhook to the credit ledger:
  - Parse `order_id` → extract `packId`
  - Look up pack from `lib/pricing.ts`
  - Create `Customer` row (or find existing by email if available in IPN payload)
  - Create `Payment` row
  - `grantCredits(accountId, pack.credits, 'purchase', paymentId)`
  - If no API key exists: generate key, store `sha256(key)`, return raw key in email
  - Commit in single DB transaction
- [ ] The IPN webhook lives in the landing app but needs DB access. Strategy:
  - Option A: IPN handler calls the API internally (recommended — keeps DB access in one place)
  - Option B: IPN handler writes directly to DB
  - **Decision**: Option A. Add `POST /v1/internal/ipn` on the API (internal-only, no Traefik route exposed). The landing IPN handler calls this endpoint.

**Verify**: Pay via NOWPayments sandbox → IPN fires → credits appear in `GET /v1/credits` → API key returned.

#### 1.5 API key issuance email

- [ ] `apps/api/src/email/`:
  - `sendApiKeyEmail(to, rawKey, packName)` — renders email template
  - Wave 2 path: log the email to console + file (founder hand-delivery)
  - If SMTP env vars set: send via SMTP
- [ ] Email template: plain-text + HTML, includes:
  - Raw API key (shown once)
  - curl example
  - Link to docs
  - `FROM: noreply@triangulate.dev`

**Verify**: After IPN completes, email content is logged (and sent if SMTP configured).

#### 1.6 Rate limiting middleware

- [ ] Token-bucket rate limiter as Hono middleware:
  - Per-API-key buckets stored in memory (Map<apiKeyHash, TokenBucket>)
  - Config per tier (Starter: burst=50, refill=1/s)
  - 429 response with `Retry-After` header + JSON body per doc/12 §3.3
- [ ] `apps/api/src/rate-limit/`:
  - `tokenBucket.ts` — token bucket implementation
  - `middleware.ts` — Hono middleware, reads tier from context

**Verify**: Send 60 requests in 1s with Starter key → first ~50 pass, rest 429.

#### 1.7 Cache layer for enrichment

- [ ] In-memory cache (Map) for enrichment results:
  - Key: `sha256(domain + name)`
  - TTL per slice: firmographic 28d, decision-maker 14d, technographic 7d, intent 24h
  - Cache hit → return cached response with `cached: true`, no credit consumed
- [ ] `apps/api/src/cache/`:
  - `enrichmentCache.ts` — get/set with TTL
- [ ] Integration into `POST /v1/enrich`:
  - Cache lookup before source fan-out
  - Cache write after enrichment

**Verify**: Enrich same email twice → second response has `cached: true`, balance unchanged.

**Phase 1 DoD**:
- PostgreSQL running in docker-compose
- Real auth: invalid keys → 401, zero balance → 402
- Credit ledger: buy → balance up, enrich → balance down, cache hit → no charge
- NOWPayments IPN → credits + API key
- Rate limiting: per-tier token bucket
- Enrichment cache: repeat lookups within 28d are free
- All stories S1–S11 (cache) covered for single-enrichment path

---

## Phase 2: Admin CLI + Refund + PII Purge

**Goal**: Operator tooling for pilot issuance, refunds, and compliance.

### Tasks

#### 2.1 Admin CLI — issue pilot key

- [ ] `apps/api/src/admin/issue-key.ts`:
  - Accepts `--email`, `--credits`, `--label`
  - Creates `Customer` + `CreditAccount` + `ApiKey`
  - Logs raw key to stdout (for founder to email manually)
  - Writes audit log entry with operator email + timestamp + reason

**Verify**: `bun run src/admin/issue-key.ts --email test@example.com --credits 50 --label "pilot-may-2026"` → key generated, credits credited.

#### 2.2 Admin CLI — refund

- [ ] `apps/api/src/admin/refund.ts`:
  - Accepts `--orderId`, `--reason`
  - Looks up `Payment` + `CreditAccount`
  - Computes prorated refund: `(unusedCredits / totalCredits) * priceUsd`
  - Sets `CreditAccount.status = "refunded"`, balance = 0
  - Creates `Refund` row
  - Logs refund details for founder action

**Verify**: `bun run src/admin/refund.ts --orderId triangulate_starter_xyz --reason "30d refund"` → account revoked, refund logged.

#### 2.3 PII purge cron

- [ ] `apps/api/src/cron/purge-expired-pii.ts`:
  - Runs daily at 03:00 UTC (via systemd timer or cron in Docker)
  - Deletes enrichment result cache entries older than their TTL
  - Emits metric: rows purged per slice type
  - Never touches customer ledger data

**Verify**: Set short TTL for test, run purge → old cache entries gone, customer data intact.

#### 2.4 GDPR region policy

- [ ] Add region detection to `POST /v1/enrich`:
  - Check email domain TLD against EU/EEA list (`.de`, `.fr`, `.uk`, `.se`, `.it`, etc.)
  - If EU: person slice is role-anonymized (name + role-level title only, no location, no LinkedIn URL)
  - Add `meta.regionPolicy: "EU-restricted"` annotation

**Verify**: Enrich `person@example.de` → person slice stripped of location, LinkedIn URL; `meta.regionPolicy` present.

**Phase 2 DoD**:
- Admin can issue pilot keys from CLI
- Admin can process refunds from CLI
- PII automatically purged per retention policy
- EU domains get GDPR-safe responses

---

## Phase 3: Webhook-fired enrichment (S3) + Dashboard foundation

**Goal**: CRM integrator path (HubSpot webhook → enrich → write back). Basic dashboard for credit viewing.

### Tasks

#### 3.1 Webhook callback infrastructure

- [ ] `POST /v1/enrich` supports optional `webhookUrl` in request body:
  ```json
  { "email": "...", "webhookUrl": "https://my-crm.example.com/hooks/triangulate" }
  ```
- [ ] After enrichment completes, fire `POST <webhookUrl>` with enrichment response + HMAC-SHA512 signature
- [ ] Retry: 3 attempts with exponential backoff (1s, 5s, 25s)
- [ ] `apps/api/src/webhooks/`:
  - `dispatch.ts` — POST to customer URL with signature

**Verify**: Enrich with webhook URL → customer endpoint receives POST with signed payload.

#### 3.2 HubSpot integration example

- [ ] `apps/api/examples/hubspot-contact-enrich.js`:
  - Cloudflare Worker template that:
    1. Receives HubSpot `contact.creation` webhook
    2. Calls `POST /v1/enrich` with contact email
    3. Maps Triangulate fields to HubSpot custom properties
    4. Calls `PATCH https://api.hubapi.com/crm/v3/objects/contacts/{id}`

**Verify**: Example documented and runnable. Not deployed — reference implementation.

#### 3.3 Minimal dashboard (credit view only)

- [ ] `apps/landing/app/dashboard/`:
  - `page.tsx` — credit balance card, recent usage table, API key list
  - `layout.tsx` — minimal nav (Credits, API Keys, Billing)
  - Auth: email magic-link via token in query param
- [ ] Dashboard consumes `GET /v1/credits` and `GET /v1/api-keys`

**Verify**: Visit `/dashboard?token=...` → see credit balance, usage history, API keys.

#### 3.4 Credit balance nudge (S10)

- [ ] When `GET /v1/credits` returns balance < 30% of original purchase for Starter tier, include:
  ```json
  { "nudge": { "threshold": 300, "remaining": 250, "message": "You've used 75% of your Starter credits. Upgrade to Team for 19% off per credit.", "upgradeUrl": "/?pricing" } }
  ```
- [ ] Dashboard shows banner when nudge active

**Verify**: Burn credits to 250 on Starter → dashboard shows upgrade nudge.

**Phase 3 DoD**:
- Webhook callback fires from enrich endpoint
- HubSpot integration example documented
- Minimal dashboard shows credits + usage + API keys
- Upgrade nudge fires at 70% consumed

---

## Phase 4: Batch enrichment (S4)

**Goal**: CSV upload → batch process → enriched CSV download.

### Tasks

#### 4.1 Batch upload endpoint

- [ ] `POST /v1/enrich/batch` — multipart CSV upload
  - Validate CSV columns (must have identifier)
  - Check credit balance ≥ estimated rows
  - Store CSV in Contabo S3-compat
  - Create `EnrichmentJob` row, status: `queued`
  - Return 202 with `jobId`, estimates

#### 4.2 Batch worker

- [ ] `apps/api/src/batch/worker.ts`:
  - Polls for `queued` jobs
  - Processes rows at 50 RPS (internal fan-out)
  - Writes per-row results to S3 file
  - Updates `EnrichmentJob` progress
  - On completion: sets status, creates presigned download URL

#### 4.3 Job status endpoint

- [ ] `GET /v1/jobs/:id` — returns job status, progress, download URL per doc/12 §3.6

#### 4.4 Batch webhook callback

- [ ] On job completion, fire webhook to customer's registered URL:
  ```json
  { "jobId": "...", "status": "completed", "downloadUrl": "..." }
  ```

**Phase 4 DoD**:
- Upload CSV → job created → worker processes → download enriched CSV
- Result CSV preserves original columns + appends `triangulate.*` prefixed columns
- 5,000 rows in <10 minutes

---

## Phase 5: Source layer (Wave 3)

**Goal**: Replace deterministic stub with real source-layer fan-out.

### Tasks

#### 5.1 Firmographic sources

- [ ] SEC EDGAR connector — company filings lookup
- [ ] Companies House connector (UK) — company registry
- [ ] Crunchbase open snapshot — funding stage, employee count

#### 5.2 Decision-maker sources

- [ ] Public LinkedIn unauthenticated pages
- [ ] Common Crawl index queries
- [ ] DuckDuckGo OSINT

#### 5.3 Technographic sources

- [ ] HTTP header fingerprinting (BuiltWith-style)
- [ ] CDN/tech stack detection from response headers

#### 5.4 Intent sources

- [ ] Job board RSS/API (LinkedIn jobs, Indeed, etc.)
- [ ] Company changelog detection
- [ ] News mention aggregation (GNews API, RSS)

#### 5.5 Contact triangulation

- [ ] MX record validation
- [ ] SMTP echo verification
- [ ] Email pattern matching per domain

**Phase 5 DoD**:
- All source connectors operational with at least P50 coverage on NA companies
- P95 latency ≤ 1.5s
- Every field has confidence score + at least one source URL
- `meta.disambiguation` and `meta.sourceDisagreement` populated from real data

---

## Phase 6: Production hardening

**Goal**: Scale, security, observability, and compliance.

### Tasks

#### 6.1 Observability

- [ ] Prometheus metrics endpoint (`GET /metrics`)
- [ ] Structured JSON logging
- [ ] Request tracing with correlation IDs

#### 6.2 Security

- [ ] Rate-limit by IP in addition to API key
- [ ] CORS strict mode for production
- [ ] API key rotation support

#### 6.3 Dashboard polish

- [ ] Full dashboard: invoices, billing history, refund requests
- [ ] Email magic-link auth (Resend or SES)

#### 6.4 Email provider

- [ ] Integrate Resend or AWS SES for transactional mail
- [ ] Templates: API key issued, credit low, refund confirmed

---

## Implementation sequence summary

```
Phase 0  [DONE]    Landing + API stub
Phase 1  [NOW]     DB + Auth + Credits + IPN → Key → Enrich loop
Phase 2  [NEXT]    Admin CLI + Refund + PII purge + GDPR
Phase 3           Webhooks + Dashboard foundation + Nudge
Phase 4           Batch enrichment (CSV upload/download)
Phase 5           Real source-layer fan-out (Wave 3)
Phase 6           Production hardening
```

Each phase is deployable independently. Phase 1 is the critical path — it makes the product sellable.

---

## Technical decisions log

| Decision | Rationale |
| --- | --- |
| PostgreSQL over SQLite | Production credit ledger needs proper transactions, concurrent access, and we're already on a VPS capable of running Postgres. |
| In-memory token bucket over Redis | Single-instance API in Phase 1–2; Redis adds ops overhead. Can migrate later. |
| In-memory enrichment cache over Redis | Same reason — single instance in early phases. Cache is ephemeral anyway. |
| Internal API for landing→API IPN | Keeps DB access in one service; avoids schema drift between two DB clients. |
| `sha256(email)` for enrichment request logs | Satisfies A3 PII retention rule — no raw personal data in request logs. |
| Hono + Bun over Express + Node | Already chosen in Phase 0. Bun cold-start is smaller; Hono is lighter. Keep it. |
| Next.js landing stays the dashboard host | No separate dashboard app needed for Phase 1–2 credit views. Add dashboard routes to landing app. |
| No managed DB service | Prin7r VPS policy — run Postgres in Docker on the VPS, not a cloud DB. |
