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

## Phase 1: Database + Auth + Credit Ledger + NOWPayments IPN ✅ DONE

**Status**: ✅ Deployed + verified 2026-05-08.

**Verification**:
- PostgreSQL running in docker-compose with all 8 tables + indexes
- Auth: invalid keys → 401 (`sha256(key)` lookup), zero balance → 402
- Credit ledger: admin CLI → credits granted → enrich consumes → cache hit free
- NOWPayments IPN: HMAC-SHA512 verified → internal API → customer + credits + API key
- Rate limiting: token-bucket per tier, 429 with `Retry-After`
- Cache: in-memory per-slice TTL, cache hits = 0 credits
- E2E tests: 41/41 pass against live deploy

**Stories covered**: S1, S2, S5, S6, S7, S8, S9, S11, ES4, A1, M1, M4

---

## Phase 2: Admin CLI + Refund + PII Purge ✅ DONE

**Status**: ✅ Implemented + verified 2026-05-08.

**Verification**:
- Admin CLI (`issue-key.ts`): Tested on live VPS — `--email test-pilot@example.com --credits 50` → customer + account + API key created, email logged, audit entry recorded.
- Admin CLI (`refund.ts`): Tested with synthetic payment — prorated $36.75 computed (750/1000 * $49), account revoked, refund row + credit_transaction recorded.
- PII purge cron: Enhanced with 90-day enrichment_requests cleanup, compliance snapshot logging. Cron enabled on VPS (daily 03:00 UTC).
- GDPR region policy: EU/EEA TLD detection in `POST /v1/enrich` → `meta.regionPolicy: "EU-restricted"`, person slice role-anonymized (name+title only, no location/LinkedIn). 28 EU TLDs covered.

---

## Phase 3: Webhook-fired enrichment (S3) + Dashboard foundation ✅ DONE

**Status**: ✅ Implemented + verified 2026-05-08.

**Verification**:
- Webhook callback: `POST /v1/enrich` accepts optional `webhookUrl`, fires HMAC-SHA512 signed POST with 1s/5s/25s exponential backoff
- HubSpot integration: Cloudflare Worker reference in `apps/api/examples/hubspot-contact-enrich.js`
- Dashboard: `/dashboard?token=<api_key>` — credit balance with progress bar, purchases table, usage table (cache-hit badges), API key CRUD
- API key endpoints: `GET/POST/DELETE /v1/api-keys` — customer-scoped, raw key returned once, self-revocation blocked
- Credit nudge: `GET /v1/credits` returns nudge at <30% balance; dashboard renders upgrade banner
- API version: `0.3.0`, DNS: `lead-enrichment.prin7r.com` → VPS `144.91.94.91`

**Stories covered**: S3, S7, S10, A4

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
