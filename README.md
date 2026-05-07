# Triangulate — Lead Enrichment Service

Triangulate is an API-first lead enrichment service. Send a lead — an email, a domain, or a name + company — and receive a verified, source-linked profile: firmographics, decision-maker mapping, technographics, intent signals, and contact triangulation. Every field carries a confidence score and a source URL. Pricing is per credit. No retainers. No black boxes.

- **Notion opportunity**: <https://www.notion.so/Lead-enrichment-service-3543ceec26198186a39afb05b2c02296>
- **Production landing**: <https://lead-enrichment.prin7r.com>
- **Production API**: `POST https://lead-enrichment.prin7r.com/v1/enrich`
- **Health check**: `GET https://lead-enrichment.prin7r.com/healthz`

## Repo structure

```
.
├── DESIGN.md                # Canonical 15-section design + style guide
├── README.md                # You are here
├── Dockerfile.landing       # Next.js 15 standalone build
├── Dockerfile.api           # Bun + Hono runtime
├── docker-compose.yml       # Both services + Traefik labels (path-based router)
├── .env.example             # Public surface for env vars (NOWPayments etc.)
├── apps/
│   ├── landing/             # Next.js 15 + ShadCN developer-portal site
│   └── api/                 # Bun + Hono — POST /v1/enrich, GET /healthz
└── docs/
    ├── 01-brand-identity.md
    ├── 02-architecture.md
    ├── 03-user-journeys.md
    ├── 04-pain-points.md
    ├── 05-audience-profile.md
    ├── 06-sales-channels.md
    ├── 07-sales-strategy.md
    ├── 08-marketing-strategy.md
    ├── 09-go-to-market.md
    ├── 10-pitch-deck.md
    ├── pitch-deck.html
    └── screenshots/
        ├── landing-desktop.png
        └── landing-mobile.png
```

## Dev quickstart

```bash
# Landing (port 3000)
cd apps/landing
pnpm install
pnpm dev

# API (port 8080)
cd apps/api
bun install
bun run dev

# Health check
curl -i http://localhost:8080/healthz

# Sample enrichment request
curl -X POST http://localhost:8080/v1/enrich \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer test_key' \
  -d '{"email":"jane.doe@stripe.com"}'
```

## Routing

Both surfaces deploy behind a single Traefik instance on `lead-enrichment.prin7r.com`:

- `lead-enrichment.prin7r.com/` → Next.js landing (port 3000 internally)
- `lead-enrichment.prin7r.com/v1/*` → Bun + Hono API (port 8080 internally)
- `lead-enrichment.prin7r.com/healthz` → Bun + Hono API
- `lead-enrichment.prin7r.com/api/*` → Next.js (server actions, NOWPayments invoice + IPN webhook)

## Screenshots

| Desktop (1440 × 900) | Mobile (390 × 844) |
| --- | --- |
| ![Landing — desktop](docs/screenshots/landing-desktop.png) | ![Landing — mobile](docs/screenshots/landing-mobile.png) |

## License

MIT — see [LICENSE](LICENSE).
