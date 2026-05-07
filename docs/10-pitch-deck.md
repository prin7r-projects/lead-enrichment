# 10 — Pitch deck (Markdown source)

Ten slides, sentence-cased, instrument-grade. The HTML render of these slides lives at `pitch-deck.html` next to this file — it opens directly in a browser with no build step.

---

## Slide 1 — Title

**Triangulate**
Per-credit lead enrichment with source-linked confidence.

For backend and revops engineers who don't want a sales call to see the schema.

---

## Slide 2 — The problem (P95)

- Apollo, ZoomInfo, Clearbit hide their schema behind a "book a demo" wall.
- Their confidence scores have no source URLs — so the buyer cannot verify.
- Bulk lists are 18 months stale on day one of delivery.
- Annual contracts. $20k minimums. No published refund policy.

**The cost.** Engineering teams stitch together three vendors and build their own pipeline. RevOps teams send outbound to dead inboxes.

---

## Slide 3 — The solution

A per-credit API. One credit, one verified record.

```
POST /v1/enrich
{ "email": "jane.doe@stripe.com" }

→ 720ms later →

{ "person": { "title": { "value": "Engineering Manager",
                         "confidence": 0.94,
                         "sources": ["https://www.linkedin.com/..."] } },
  "company": { ... },
  "technographics": [ ... ],
  "intent": { "hiring": { "openRoles": 142 }, ... },
  "meta": { "freshness": { "ageDays": 3 },
            "creditsRemaining": 9_873 } }
```

Every field carries a confidence score and at least one source URL.

---

## Slide 4 — Why now

- Outbound is breaking. Open rates fell from 35% to 18% over four years; reply rates are at all-time lows.
- The "bulk list" market is consolidating into two giants. Engineers want an alternative.
- Stablecoin invoicing (NOWPayments) finally lets a small vendor accept paid pilots without six months of merchant-processor onboarding.
- Public data sources (SEC EDGAR, Companies House, Common Crawl, public LinkedIn) are richer in 2026 than ever before — and they are accessible via well-behaved fetches at scale.

---

## Slide 5 — Market sizing

- Global lead-enrichment market: ~$3.0B annually (2026).
- Segment we serve: per-credit, per-record-on-demand — currently <5% of the market, but growing 35% YoY.
- ICP size: ~30,000 B2B SaaS companies between Series A and Series C globally. ~10,000 of those run at least 1k enrichments/month.
- Achievable annual revenue at $0.04/credit average and 1% of ICP at the Team tier: ~$4M ARR. At 5% of ICP: ~$20M ARR.

---

## Slide 6 — Product wedge

**Source-linked confidence.** Every confidence score ships with at least one public source URL. No black box.

**Per-credit pricing.** $49 for 1k credits. $399 for 10k. $2,499 for 100k. No contract.

**Latency-bounded.** P50 720ms. P95 1.4s. Published methodology.

**API-first.** No UI for the enriched data. You build your own. Stable JSON schema.

**Freshness on every response.** `meta.freshness.ageDays` tells you how stale the cached record is. Refresh per-record, on demand.

---

## Slide 7 — Competitive landscape

| Vendor | Schema visible | Per-record price | Refund policy | Source URLs |
| --- | --- | --- | --- | --- |
| ZoomInfo | No | ~$0.08–$0.20 | Case-by-case | No |
| Apollo (Pro) | Partial | ~$0.06–$0.12 | Case-by-case | No |
| Clearbit-Reveal | Partial | ~$0.10 | Case-by-case | No |
| Lusha | Yes | ~$0.05 | Case-by-case | No |
| Cognism | No | ~$0.10 | Case-by-case | No |
| **Triangulate** | **Yes** | **$0.025–$0.049** | **Prorated 30-day** | **Yes** |

We are the only vendor in the table that wins on all four columns simultaneously.

---

## Slide 8 — Business model & traction

**Pricing.**
- Starter — 1,000 credits, $49 ($0.049/credit)
- Team — 10,000 credits, $399 ($0.0399/credit)
- Scale — 100,000 credits, $2,499 ($0.02499/credit)

**Wave 2 traction goals (Day 0 → Day 90).**
- 25 paying customers.
- $5,000 MRR.
- $60,000 ARR run-rate at Day 90.
- 1 Scale-tier paid pilot.

**Year-1 forecast (Day 0 → Day 365).**
- 250 paying customers.
- $40,000 MRR.
- $480,000 ARR.

**Unit economics.** Average pack price ~$160. Gross margin >85% (cost is mostly source-layer compute and stablecoin payment fees). Payback period <30 days for Starter and Team tiers.

---

## Slide 9 — Roadmap

**Wave 2 (now).** Landing, API contract, NOWPayments self-serve checkout, deterministic enrichment stub for testing.

**Wave 3 (Q3 2026).** Real source-layer fan-out for firmographics + decision-makers. SDK on npm. Postman collection. First Hightouch / Census integration recipes.

**Wave 4 (Q4 2026).** Technographics. Intent signals. SOC-2 Type I engagement. Card-on-ramp via NOWPayments fiat partner.

**Wave 5 (Q1 2027).** Webhook-based bulk enrichment. Free-tier (50 credits/month). Public benchmarks dashboard.

**Wave 6 (Q2 2027).** SOC-2 Type II. EU residency. Custom enterprise contracts.

---

## Slide 10 — Ask

**For early customers.** Pay $49 to start. Email founder@triangulate.dev for a 50-credit free pilot.

**For partners.** Hightouch, Census, Inngest — let's ship a co-authored integration recipe.

**For investors.** Pre-seed not raising in Wave 2. Will revisit at $100k MRR (target: end of Wave 4).

**For everyone else.** Try the curl. The proof is in the response.

```
curl -X POST https://lead-enrichment.prin7r.com/v1/enrich \
  -H 'authorization: Bearer YOUR_KEY' \
  -d '{"email":"someone@somecompany.com"}'
```
