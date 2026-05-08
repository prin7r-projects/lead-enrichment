# 12 — Technical Specification

> Written by DS Pi Engineer per doc/11 user stories. Every endpoint below is traceable to at least one story in §2 and one scenario in §3 of doc/11. No orphan endpoints, no orphan stories.

---

## 1. System overview

Triangulate is a two-service application behind a single Traefik reverse proxy on `lead-enrichment.prin7r.com`:

| Service | Runtime | Port | Routes |
| --- | --- | --- | --- |
| `triangulate-landing` | Next.js 15 (standalone) | 3000 | `/`, `/api/checkout/*`, `/api/webhooks/*` |
| `triangulate-api` | Bun + Hono 4 | 8080 | `/v1/*`, `/healthz` |

Traefik routes by path prefix:
- `Host(lead-enrichment.prin7r.com) && (PathPrefix(/v1/) || Path(/healthz))` → API (priority 10)
- `Host(lead-enrichment.prin7r.com)` → Landing (priority 1, default)

---

## 2. Response schema contract

This is the canonical enrichment response shape. Every consumer-facing endpoint returning enrichment data MUST conform to this schema. Drift between this spec, `02-architecture.md`, and the actual API response is a defect.

```json
{
  "request": {
    "input": { "email": "jane.doe@stripe.com" },
    "correlationId": "01HY...",
    "ts": 1715212800000,
    "latencyMs": 47,
    "cached": false
  },
  "person": {
    "fullName": {
      "value": "Jane Doe",
      "confidence": 0.97,
      "sources": ["https://www.linkedin.com/in/jane-doe"]
    },
    "title": {
      "value": "Engineering Manager",
      "confidence": 0.94,
      "sources": ["https://www.linkedin.com/in/jane-doe"]
    },
    "department": {
      "value": "Engineering",
      "confidence": 0.95
    },
    "location": {
      "value": { "city": "San Francisco", "country": "US" },
      "confidence": 0.86
    }
  },
  "company": {
    "domain": "stripe.com",
    "name": {
      "value": "Stripe, Inc.",
      "confidence": 0.99,
      "sources": ["https://www.sec.gov/cgi-bin/browse-edgar?CIK=stripe"]
    },
    "industry": {
      "value": "Financial Infrastructure",
      "confidence": 0.96
    },
    "employeeCount": {
      "value": 8500,
      "range": [7000, 10000],
      "confidence": 0.83
    },
    "hqLocation": {
      "value": { "city": "South San Francisco", "country": "US" },
      "confidence": 0.95
    },
    "fundingStage": {
      "value": "Late stage / private",
      "lastRound": "Series I, 2026-03",
      "confidence": 0.91
    }
  },
  "technographics": [
    { "category": "CDN", "vendor": "Cloudflare", "confidence": 0.98 },
    { "category": "Frontend framework", "vendor": "React", "confidence": 0.94 }
  ],
  "intent": {
    "hiring": {
      "openRoles": 142,
      "byDept": { "Engineering": 71, "Sales": 24, "Other": 47 },
      "asOf": "2026-05-07"
    },
    "newsMentions7d": 8,
    "changelogActivity": "active"
  },
  "contactTriangulation": {
    "emailDeliverability": {
      "status": "valid",
      "method": "smtp_echo + mx_match",
      "confidence": 0.92
    },
    "phonePatternMatch": { "status": "not_attempted" }
  },
  "meta": {
    "freshness": {
      "ageDays": 3,
      "refreshedAt": "2026-05-05T08:00:00Z"
    },
    "budgetMs": 1500,
    "creditsRemaining": 9873
  }
}
```

### 2.1. Special response fields

| Field | Type | When present | Description |
| --- | --- | --- | --- |
| `meta.disambiguation` | object | ≥2 candidates within 0.10 confidence | `{ candidates: int, strategy: "most_recent_source" }` |
| `meta.sourceDisagreement` | object | Sources disagree on a field | `{ field: string, picked: string, overruled: string }` |
| `meta.regionPolicy` | string | EU/EEA email domain | Always `"EU-restricted"` — person slice is role-anonymized |
| `meta.policy` | string | Free-mail domain (gmail.com, etc.) | `"personal_email_excluded"` — person is null, no credit consumed |

### 2.2. `not_match` vs `null`

- `null` — no data was found for that slice; we did not attempt to guess.
- `not_match` is **not** a top-level status. A field absent from the response means it could not be triangulated.
- `"status": "not_attempted"` — used inside sub-objects like `contactTriangulation.emailDeliverability` when the input didn't include that identifier type.

---

## 3. API endpoints

### 3.1. `GET /healthz`

**Auth**: None.

**Response `200`**:
```json
{ "status": "ok", "service": "triangulate-api", "version": "0.1.0", "ts": 1715212800000 }
```

**Used by**: Traefik liveness probe.

---

### 3.2. `GET /v1/coverage`

**Auth**: None.

**Response `200`**:
```json
{
  "regions": [
    { "code": "NA", "coveragePct": 94, "freshnessDays": 28 },
    { "code": "EMEA", "coveragePct": 81, "freshnessDays": 28 },
    { "code": "LATAM", "coveragePct": 62, "freshnessDays": 28 },
    { "code": "APAC", "coveragePct": 71, "freshnessDays": 28 }
  ],
  "fields": {
    "person.fullName": { "confidenceMedian": 0.94, "sourcesPerField": 1.4 },
    "person.title": { "confidenceMedian": 0.92, "sourcesPerField": 1.6 },
    "company.industry": { "confidenceMedian": 0.95, "sourcesPerField": 1.2 },
    "company.employeeCount": { "confidenceMedian": 0.83, "sourcesPerField": 1.1 },
    "company.fundingStage": { "confidenceMedian": 0.91, "sourcesPerField": 1.3 },
    "technographics": { "confidenceMedian": 0.93, "sourcesPerField": 1.0 },
    "intent.hiring": { "confidenceMedian": 0.97, "sourcesPerField": 1.0 },
    "contactTriangulation.emailDeliverability": { "confidenceMedian": 0.92, "sourcesPerField": 1.0 }
  },
  "methodology": "Coverage measured against a benchmark of 1,000 ICP-shape companies (B2B SaaS, Series A–C, 50–500 employees), refreshed quarterly."
}
```

**Maps to**: S1 (Discovery & schema verification).

---

### 3.3. `POST /v1/enrich`

**Auth**: `Authorization: Bearer <api_key>` (required).

**Request body** (validated via Zod):
```json
{
  "email": "jane.doe@stripe.com",
  "domain": "stripe.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "company": "Stripe"
}
```

At least one identifier must be provided: `{ email }`, `{ domain }`, or `{ firstName, lastName, company }`.

**Response `200`**: Full enrichment response per §2.

**Cache semantics** (S11):
- Cache key: `sha256(domain + name)` where name = `firstName + lastName` or derived from email local-part.
- Cache hit within 28 days → return cached response with `request.cached: true`, no credit consumed.
- Firmographic cache: 28-day TTL.
- Decision-maker cache: 14-day TTL.
- Technographic cache: 7-day TTL.
- Intent cache: 24-hour TTL.

**Edge cases**:

| Case | Behavior |
| --- | --- |
| ES1 — Ambiguous email | Returns ONE result with `meta.disambiguation` |
| ES2 — Domain-only | `person: null`, credit consumed |
| ES3 — EU domain (.de, .fr, etc.) | `meta.regionPolicy: "EU-restricted"`, person role-anonymized |
| A1 — Free-mail domain | `person: null`, `meta.policy: "personal_email_excluded"`, credit NOT consumed |
| ES4 — Rate limit | 429 with `Retry-After` header |
| ES5 — Source disagreement | `meta.sourceDisagreement`, picks most recent source |

**Errors**:

| Status | Body |
| --- | --- |
| 400 | `{ error: "bad_request", message: "...", issues: [...], correlationId }` |
| 401 | `{ error: "unauthorized", message: "...", correlationId }` |
| 402 | `{ error: "no_credits", message: "Credit balance exhausted.", correlationId }` |
| 429 | `{ error: "rate_limited", limit: 50, window: "1s", retryAfterMs: 1000 }` |
| 500 | `{ error: "internal_error", message: "Unhandled exception.", correlationId }` |
| 504 | `{ error: "timeout", correlationId }` |

**Headers**:
- `x-triangulate-correlation-id` — ULID correlation id on every response.
- `Retry-After` — seconds until next allowed request (only on 429).

**Rate limits** (ES4):
- Starter: 50 RPS / 1 RPS sustained 24h.
- Team: 250 RPS / 5 RPS sustained.
- Scale: contractually per-MSA.
- Implemented as token-bucket at the Hono middleware layer.
- 429s never consume credits.

**Maps to**: S2 (First curl), S3 (Webhook-fired), S8 (Confidence score), S9 (not_match handling), S11 (Cache hit).

---

### 3.4. `GET /v1/credits`

**Auth**: `Authorization: Bearer <api_key>` (required).

**Response `200`**:
```json
{
  "accountId": "acct_01HY...",
  "balance": 9873,
  "lifetimeConsumed": 127,
  "purchases": [
    {
      "packId": "starter",
      "credits": 1000,
      "priceUsd": 49,
      "purchasedAt": "2026-05-01T12:00:00Z"
    }
  ],
  "recentUsage": [
    {
      "correlationId": "01HY...",
      "input": { "email": "j.doe@example.com" },
      "consumedAt": "2026-05-08T10:00:00Z",
      "cached": false
    }
  ],
  "lastRefreshedAt": "2026-05-08T10:00:00Z"
}
```

`recentUsage` returns the last 100 enrichment requests. `lifetimeConsumed` is all-time credits deducted (excluding cache hits).

**Maps to**: S7 (Inspect credits), S10 (Upgrade nudge).

---

### 3.5. `POST /v1/enrich/batch`

**Auth**: `Authorization: Bearer <api_key>` (required). Team tier minimum.

**Request**: `multipart/form-data` with a CSV file field `file`.

CSV requirements:
- Must include at least one identifier column: `email`, `domain`, or (`firstName` + `lastName` + `company`).
- Max 10,000 rows (Team tier), 100,000 rows (Scale tier).
- Max file size: 50MB.

**Response `202`**:
```json
{
  "jobId": "job_01HY...",
  "status": "queued",
  "rowCount": 5000,
  "estimatedCredits": 5000,
  "estimatedDurationSec": 540,
  "createdAt": "2026-05-08T10:00:00Z"
}
```

**Errors**:

| Status | Body |
| --- | --- |
| 400 | `{ error: "bad_request", message: "CSV missing required identifier column. Must include email, domain, or firstName+lastName+company." }` |
| 402 | `{ error: "no_credits", message: "Insufficient credits. Need 5000, have 1200." }` |
| 413 | `{ error: "too_large", message: "File exceeds 50MB limit." }` |

**Maps to**: S4 (Bulk CSV).

---

### 3.6. `GET /v1/jobs/:id`

**Auth**: `Authorization: Bearer <api_key>` (required).

**Response `200`**:
```json
{
  "jobId": "job_01HY...",
  "status": "processing",
  "rowCount": 5000,
  "completedRows": 3241,
  "failedRows": 2,
  "estimatedCredits": 5000,
  "creditsConsumed": 3241,
  "createdAt": "2026-05-08T10:00:00Z",
  "completedAt": null,
  "downloadUrl": null,
  "webhookFired": false
}
```

When `status: "completed"`:
```json
{
  "jobId": "job_01HY...",
  "status": "completed",
  "rowCount": 5000,
  "completedRows": 4998,
  "failedRows": 2,
  "creditsConsumed": 4998,
  "downloadUrl": "https://s3.contabo.com/.../job_01HY_results.csv?presigned=...",
  "downloadUrlExpiresAt": "2026-05-08T10:25:00Z"
}
```

**Status values**: `queued` → `processing` → `completed` / `failed` / `partial`.

**Result CSV format**: Original columns preserved, Triangulate columns appended prefixed `triangulate.` — e.g., `triangulate.person.fullName.value`, `triangulate.person.fullName.confidence`, `triangulate.person.fullName.sources`.

**Maps to**: S4 (Bulk CSV).

---

### 3.7. `GET /v1/api-keys`

**Auth**: `Authorization: Bearer <api_key>` (required).

**Response `200`**:
```json
{
  "keys": [
    {
      "id": "key_01HY...",
      "prefix": "tri_live_01HY",
      "label": "production",
      "createdAt": "2026-05-01T12:00:00Z",
      "lastUsedAt": "2026-05-08T10:00:00Z"
    }
  ]
}
```

**Maps to**: Dashboard API key management (doc 11 §A4).

---

### 3.8. `POST /v1/api-keys`

**Auth**: `Authorization: Bearer <api_key>` (required).

**Request**:
```json
{ "label": "staging" }
```

**Response `201`**:
```json
{
  "id": "key_01HY...",
  "key": "tri_live_01HYABC...",
  "prefix": "tri_live_01HY",
  "label": "staging",
  "createdAt": "2026-05-08T10:00:00Z"
}
```

The raw `key` is returned exactly once (in this response). Only `sha256(key)` is stored in the database.

**Maps to**: Dashboard API key management.

---

### 3.9. `DELETE /v1/api-keys/:id`

**Auth**: `Authorization: Bearer <api_key>` (required).

Revokes the specified key. The current key cannot revoke itself.

**Response `200`**:
```json
{ "ok": true, "revoked": "key_01HY..." }
```

---

## 4. Landing API routes

These routes are colocated with the Next.js landing app, served under the `/api/` path.

### 4.1. `POST /api/checkout/nowpayments`

**Auth**: None (public).

**Request**:
```json
{ "packId": "starter" }
```

Valid `packId` values: `starter`, `team`, `scale` (per `lib/pricing.ts`).

**Response `200`**:
```json
{
  "ok": true,
  "orderId": "triangulate_starter_lx4abc_xyz123",
  "invoiceUrl": "https://nowpayments.io/invoice/...",
  "invoiceId": "123456789",
  "pack": { "id": "starter", "credits": 1000, "priceUsd": 49 }
}
```

**Flow**:
1. Validate `packId` → 400 if unknown.
2. If `NOWPAYMENTS_API_KEY` missing → 503 `{ error: "missing_env" }`.
3. `POST https://api.nowpayments.io/v1/invoice` with:
   - `price_amount`: pack price in USD
   - `price_currency`: `"usd"`
   - `order_id`: `triangulate_{packId}_{ts}_{rnd}`
   - `ipn_callback_url`: `https://lead-enrichment.prin7r.com/api/webhooks/nowpayments`
   - `success_url` / `cancel_url`: landing with query params
4. Return `invoiceUrl` — user is redirected to NOWPayments hosted invoice.

**Maps to**: S5 (Buy credit pack), M4 (Credit-pack purchase).

---

### 4.2. `POST /api/webhooks/nowpayments`

**Auth**: HMAC-SHA512 signature in `x-nowpayments-sig` header.

**Verification**: `HMAC-SHA512(JSON.stringify(sortObject(payload)), NOWPAYMENTS_IPN_SECRET)` compared with timing-safe equality against `x-nowpayments-sig`.

**On valid payment** (`payment_status: "finished"` or `"confirmed"`):
1. Parse `order_id` to extract `packId`.
2. Look up pack definition from `lib/pricing.ts`.
3. Create `Payment` row in DB.
4. Create or update `CreditAccount` — credit `pack.credits`.
5. Create `CreditTransaction` row (type: `purchase`).
6. If no API key exists for this customer, create `ApiKey` row + dispatch email with raw key.
7. Return `{ ok: true, verified: true, paid: true, orderId }`.

**On invalid signature**: 401, never persist.

**On missing `NOWPAYMENTS_IPN_SECRET`**: 503, log warning.

**Maps to**: S6 (API key after payment), M4 (Credit-pack purchase).

---

## 5. Admin endpoints / CLI

### 5.1. Issue pilot key

```bash
bun apps/api/src/admin/issue-key.ts \
  --email hannah@example.com \
  --credits 50 \
  --label "pilot-sj-2026-05"
```

Creates `Customer` + `CreditAccount` + `ApiKey` rows. Emits email with raw key.

**Maps to**: M6 (Founder pilot).

### 5.2. Refund

```bash
bun apps/api/src/admin/refund.ts \
  --orderId triangulate_starter_xyz \
  --reason "Wave 2 manual refund within 30d window"
```

1. Looks up `Payment` + linked `CreditAccount`.
2. Computes prorated: `(unusedCredits / totalCredits) * priceUsd`.
3. Marks `CreditAccount.status = "refunded"`, revokes remaining credits.
4. Writes `Refund` row.

**Maps to**: S12 (Refund policy), ES6 (Failed payment).

---

## 6. Database schema

### 6.1. Tables

```sql
-- Customers who have purchased or received pilot credits.
CREATE TABLE customers (
  id          TEXT PRIMARY KEY DEFAULT ('cus_' || gen_random_uuid()::text),
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB DEFAULT '{}'
);

-- API keys for accessing the enrichment API.
CREATE TABLE api_keys (
  id            TEXT PRIMARY KEY DEFAULT ('key_' || gen_random_uuid()::text),
  customer_id   TEXT NOT NULL REFERENCES customers(id),
  prefix        TEXT NOT NULL,           -- "tri_live_<ulid>"
  key_hash      TEXT NOT NULL UNIQUE,    -- sha256(raw_key)
  label         TEXT DEFAULT 'default',
  status        TEXT NOT NULL DEFAULT 'active',  -- active, revoked
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ
);

-- Credit accounts — one per customer.
CREATE TABLE credit_accounts (
  id              TEXT PRIMARY KEY DEFAULT ('acct_' || gen_random_uuid()::text),
  customer_id     TEXT NOT NULL UNIQUE REFERENCES customers(id),
  balance         INTEGER NOT NULL DEFAULT 0,
  lifetime_used   INTEGER NOT NULL DEFAULT 0,
  tier            TEXT NOT NULL DEFAULT 'starter',  -- starter, team, scale
  status          TEXT NOT NULL DEFAULT 'active',   -- active, refunded, closed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual credit transactions.
CREATE TABLE credit_transactions (
  id              TEXT PRIMARY KEY DEFAULT ('txn_' || gen_random_uuid()::text),
  account_id      TEXT NOT NULL REFERENCES credit_accounts(id),
  type            TEXT NOT NULL,  -- purchase, consume, refund, admin_grant, admin_revoke
  amount          INTEGER NOT NULL,
  balance_after   INTEGER NOT NULL,
  enrichment_id   TEXT,            -- FK to enrichment_requests for consume txns
  payment_id      TEXT,            -- FK to payments for purchase txns
  correlation_id  TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments received via NOWPayments.
CREATE TABLE payments (
  id              TEXT PRIMARY KEY DEFAULT ('pay_' || gen_random_uuid()::text),
  order_id        TEXT NOT NULL UNIQUE,
  pack_id         TEXT NOT NULL,
  customer_id     TEXT REFERENCES customers(id),
  price_usd       NUMERIC(10,2) NOT NULL,
  credits         INTEGER NOT NULL,
  pay_currency    TEXT,
  pay_amount      NUMERIC(20,8),
  payment_status  TEXT NOT NULL,
  ipn_raw         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

-- Refunds.
CREATE TABLE refunds (
  id            TEXT PRIMARY KEY DEFAULT ('ref_' || gen_random_uuid()::text),
  payment_id    TEXT NOT NULL REFERENCES payments(id),
  amount_usd    NUMERIC(10,2) NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrichment requests log (for usage tracking, not PII retention).
CREATE TABLE enrichment_requests (
  id              TEXT PRIMARY KEY DEFAULT ('enr_' || gen_random_uuid()::text),
  account_id      TEXT NOT NULL REFERENCES credit_accounts(id),
  api_key_id      TEXT NOT NULL REFERENCES api_keys(id),
  correlation_id  TEXT NOT NULL UNIQUE,
  input_email     TEXT,       -- hashed: sha256(email)
  input_domain    TEXT,
  cached          BOOLEAN NOT NULL DEFAULT false,
  credit_consumed BOOLEAN NOT NULL DEFAULT true,
  response_shape  TEXT,       -- which slices populated (person,company,technographics,intent,contact)
  latency_ms      INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enrichment job (batch).
CREATE TABLE enrichment_jobs (
  id                    TEXT PRIMARY KEY DEFAULT ('job_' || gen_random_uuid()::text),
  account_id            TEXT NOT NULL REFERENCES credit_accounts(id),
  status                TEXT NOT NULL DEFAULT 'queued',  -- queued,processing,completed,failed,partial
  row_count             INTEGER NOT NULL,
  completed_rows        INTEGER NOT NULL DEFAULT 0,
  failed_rows           INTEGER NOT NULL DEFAULT 0,
  credits_consumed      INTEGER NOT NULL DEFAULT 0,
  result_object_key     TEXT,
  webhook_url           TEXT,
  webhook_fired         BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ
);
```

### 6.2. PII retention policy (A3)

- `enrichment_requests.input_email` stores `sha256(email)` — never the raw email.
- No enrichment result data persists beyond its cache TTL.
- Cron job `purge-expired-pii` runs nightly at 03:00 UTC, deletes enrichment result cache rows older than their tier's TTL.
- Customer ledger data (customers, credit_accounts, api_keys, payments) is exempt — it's the customer's own contract data.

---

## 7. API key format

```
tri_live_<ulid>_<base32rand>
```

- `tri_live_` — static prefix indicating production key.
- `<ulid>` — 26-character ULID.
- `<base32rand>` — 16 characters of Crockford base32 random.

Example: `tri_live_01HYABC1234567890XYZ_7G4K9M2P5R8V1N3Q`

Storage: only `sha256(key)` persisted. Raw key shown once (in email or creation response).

Test keys: `tri_test_<ulid>_<base32rand>` for dev/sandbox environments.

---

## 8. Rate limiting

Token-bucket algorithm per API key, evaluated per second.

| Tier | Burst (tokens) | Refill rate (tokens/sec) | Sustained 24h equivalent |
| --- | --- | --- | --- |
| Starter | 50 | 1 | ~1 RPS sustained |
| Team | 250 | 5 | ~5 RPS sustained |
| Scale | Contractual | Contractual | Per MSA |

Implementation: Hono middleware with in-memory token bucket (backed by Redis in production for multi-instance correctness). 429 response includes `Retry-After` header and JSON body with `retryAfterMs`.

---

## 9. Performance budget

| Metric | Target | Measured at |
| --- | --- | --- |
| `POST /v1/enrich` P50 | <100ms | API response time (stub/Phase 0) |
| `POST /v1/enrich` P95 | <1500ms | API response time (full source layer) |
| `GET /v1/credits` P95 | <50ms | API response time |
| `POST /v1/enrich/batch` 5000 rows | <10min wall-clock | Job completion time |
| IPN → API key email | <60s | NOWPayments IPN to email sent |
| Health check | <10ms | `/healthz` response time |

---

## 10. Environment variables

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:5432/triangulate
NOWPAYMENTS_API_KEY=           # NOWPayments API key
NOWPAYMENTS_IPN_SECRET=        # NOWPayments IPN HMAC secret
NEXT_PUBLIC_APP_URL=https://lead-enrichment.prin7r.com

# Optional (Wave 2)
REDIS_URL=redis://host:6379    # Cache layer (stub-compatible without)
SMTP_HOST=                     # Transactional email (Wave 2: founder hand-delivery)
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=noreply@triangulate.dev

# Rate limiting
RATE_LIMIT_STARTER_BURST=50
RATE_LIMIT_STARTER_REFILL=1
RATE_LIMIT_TEAM_BURST=250
RATE_LIMIT_TEAM_REFILL=5

# API config
PORT=8080
NODE_ENV=production
```

---

## 11. Cross-reference: Stories → Endpoints → Phases

| Story | Endpoint(s) | Phase | Priority |
| --- | --- | --- | --- |
| S1 | `GET /v1/coverage` | Phase 0 | P0 — already implemented |
| S2 | `POST /v1/enrich` | Phase 0 | P0 — already implemented (stub) |
| S3 | `POST /v1/enrich` + webhook callback | Phase 3 | P2 |
| S4 | `POST /v1/enrich/batch`, `GET /v1/jobs/:id` | Phase 4 | P2 |
| S5 | `POST /api/checkout/nowpayments` | Phase 1 | P0 — already implemented |
| S6 | `POST /api/webhooks/nowpayments` + credit ledger | Phase 1 | P0 |
| S7 | `GET /v1/credits` | Phase 1 | P0 |
| S8 | Response schema contract | Phase 0 | P0 — already implemented |
| S9 | Response schema + `not_match` handling | Phase 0 | P0 |
| S10 | `GET /v1/credits` + nudge | Phase 3 | P2 |
| S11 | Cache semantics | Phase 1 | P1 |
| S12 | Admin refund CLI | Phase 2 | P1 |
| M1 | Full checkout → enrich flow | Phase 1 | P0 |
| M4 | Credit-pack purchase + key issuance | Phase 1 | P0 |
| M6 | Pilot key issuance | Phase 2 | P1 |
| ES4 | Rate limiting | Phase 1 | P0 |
| ES6 | Refund flow | Phase 2 | P1 |
| A1 | Free-mail exclusion | Phase 1 | P0 |
| A3 | PII purge cron | Phase 2 | P1 |
