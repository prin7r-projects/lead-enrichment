# 04 — Pain points

Root-cause analysis of the existing lead-enrichment market, organized by the alternative we displace and the specific failure mode of each. Every pain point below names a wedge — the place where Triangulate's per-credit, source-linked, latency-bounded design fixes the failure.

## Pain point P1 — "I cannot see your schema before I pay"

**Where it happens.** Apollo, ZoomInfo, Lusha, Clearbit-Reveal landing pages.
**Symptom.** "Book a demo to see what fields we return." The schema is gated behind a 30-minute call with an SDR.
**Root cause.** These vendors monetize seats; their docs are sales surfaces, not engineering surfaces. Showing the schema would let prospects verify the product's coverage themselves and skip the sales call.
**Cost to the buyer.** Backend engineers waste 30–90 minutes per vendor on demos that don't answer the schema question. The honest answer ("does your `company.fundingStage` field cover Series I or only Series A through E?") never gets answered without paid-pilot access.
**Triangulate's wedge.** The schema is the hero of the landing page. The exact JSON shape is on the public site. The API docs section embeds the request and response side-by-side. Engineers get to "yes" or "no" in five minutes.

## Pain point P2 — "Confidence is a black box"

**Where it happens.** Every major enrichment vendor.
**Symptom.** Bulk-list providers ship a `confidence: 0.78` field with zero explanation. The buyer has to take the vendor's word for it.
**Root cause.** Confidence comes from proprietary scoring models the vendor doesn't want to expose. Often the score is just an inverse-frequency proxy — "we have seen this email signature 87 times in the last 90 days, therefore confidence = 0.87" — but selling that is harder than selling a black box.
**Cost to the buyer.** The GTM team treats every record as if confidence = 1.0 (because the alternative is to manually audit each one). Outbound copy lands incorrectly attributed; reply rates suffer; the vendor blames the user's templates.
**Triangulate's wedge.** Every field's confidence comes with at least one source URL. If a buyer doesn't trust the confidence score, they can click the source and see the underlying public document (10-K, LinkedIn page, company changelog). We never ship a score without provenance.

## Pain point P3 — "The data is 18 months stale"

**Where it happens.** Bulk-list resellers (Apollo, ZoomInfo lists for SMB).
**Symptom.** Job titles, employer affiliations, and direct dials drift fast — annual churn of 25%+ in tech sales roles. A vendor's 50-million-record snapshot from Q4 2024 is wrong on 8M+ rows by Q2 2026.
**Root cause.** Bulk lists are economically priced for volume — they are refreshed quarterly at best. The vendor doesn't have a per-record incentive to keep any one row fresh.
**Cost to the buyer.** Sales reps email people who have changed jobs. Outbound lands in dead inboxes. Targeting decisions are made on stale firmographics.
**Triangulate's wedge.** Per-credit pricing aligns the incentive: the buyer pays for *fresh* enrichment, on demand, each time. The freshness window is 28 days for firmographics, 14 for decision-maker mapping, 24 hours for intent. We expose the freshness on every response (`meta.freshness.ageDays`).

## Pain point P4 — "Pricing requires a contract"

**Where it happens.** ZoomInfo, Cognism, ClearbitConnect-business.
**Symptom.** No pricing on the website. No self-service. Annual contracts only. Minimum spend often $20k–$60k for SMBs.
**Root cause.** The vendor's sales model is built on multi-year ACV. Their CFO's revenue forecast assumes contracts; their CRO's quota requires quotas. Both incentives push them to refuse to publish prices.
**Cost to the buyer.** Founder-operators and small RevOps teams cannot evaluate the product against their actual spend. They either over-buy or skip the category entirely.
**Triangulate's wedge.** Pricing is on the homepage. Three credit packs, all self-serve, all paid via NOWPayments. The minimum is one credit pack ($49). No contract, no sales call.

## Pain point P5 — "Refund policy is opaque"

**Where it happens.** Most enrichment vendors.
**Symptom.** No published refund policy. Customer-success managers handle refund requests case-by-case. Refunds are usually denied because "the data was delivered."
**Root cause.** Without a published policy, the vendor preserves margin on every dispute. The asymmetry is intentional.
**Cost to the buyer.** Engineering teams hesitate to commit because they cannot model the worst-case spend.
**Triangulate's wedge.** Published refund: prorated to unused credits within 30 days, refunded to the same payment rail (USDT/USDC). Stated in the FAQ. No call required.

## Pain point P6 — "Latency is a marketing claim, not a measured number"

**Where it happens.** Most "real-time" enrichment vendors.
**Symptom.** The vendor's hero says "real-time enrichment." The actual P95 latency is unstated.
**Root cause.** Honest latency numbers (P50 / P95 / P99 with measurement methodology) are easy to publish but rarely demanded by buyers, so vendors don't bother. When buyers measure latency themselves, they often see 5–10s P95 — too slow for anything beyond batch enrichment.
**Cost to the buyer.** Real-time UX patterns (auto-enriching a row when a SDR types an email into Salesforce) become impossible without round-tripping a 5s vendor delay.
**Triangulate's wedge.** Published P50, P95, P99 on the proof row. The measurement methodology is linked from the proof row tooltip. SLAs in the Scale tier hold us to ≤ 1.5s P95.

## Pain point P7 — "OAuth dance for a single API key"

**Where it happens.** Several modern enrichment APIs (Clearbit's developer portal, others).
**Symptom.** Getting an API key requires signing into a developer portal, validating an email, completing an OAuth handshake, and generating a key inside a UI. Often 27+ minutes from "I want to test this" to "I have a working curl."
**Root cause.** Vendors over-instrument the developer onboarding for telemetry. Each step feels like a tiny improvement; the cumulative effect is hostile.
**Cost to the buyer.** First-curl time is the #1 leading indicator of developer adoption. A 27-minute first-curl means the engineer abandons before they have ever seen a successful response.
**Triangulate's wedge.** First-curl < 5 minutes. Pay → email → key → curl. No portal. No OAuth.

## Pain point P8 — "We sell scraped, unverified bulk lists branded as enrichment"

**Where it happens.** The bottom of the market — Lusha clones, Apollo's older bulk packages.
**Symptom.** Records arrive as CSV exports of mass-scraped contact lists. Many of the email addresses are pattern-guessed (`{first}.{last}@{domain}`) and never verified. Compliance posture is shaky.
**Root cause.** Scraping is cheap; verification is expensive. Selling unverified data at a 100× markup is profitable until a regulator or LinkedIn lawyer notices.
**Cost to the buyer.** Send a million scraped emails and your domain reputation collapses. Your outbound capacity gets cut by 80% for six months.
**Triangulate's wedge.** No bulk lists. Per-credit, per-record enrichment. SMTP echo + MX validation on every contact field. We *will* return `not_match` instead of guessing.

## Pain point P9 — "I cannot integrate the data into my system"

**Where it happens.** UI-first vendors (Apollo dashboard, ZoomInfo Engage).
**Symptom.** The "enrichment" lives inside the vendor's UI. Exporting to Salesforce or Hubspot requires their connector — which costs extra and lags by 24+ hours.
**Root cause.** Vendor lock-in increases ACV. The UI is the moat; the API is an afterthought.
**Cost to the buyer.** Real engineering pipelines (Cloudflare Workers, Hightouch reverse ETL, dbt models) cannot consume the data without a 24-hour delay or a custom connector.
**Triangulate's wedge.** API-first. There is no Triangulate UI for the enriched data — you build your own. Webhook callbacks for batch completion. Per-record returns are JSON over HTTPS, exactly the shape you cache.

## Summary table

| ID | Pain | Wedge |
| --- | --- | --- |
| P1 | Hidden schema | Schema is the hero |
| P2 | Black-box confidence | Per-field source URLs + scores |
| P3 | Stale data | Per-credit pricing aligns to fresh enrichment |
| P4 | Contract-only pricing | Three self-serve credit packs |
| P5 | Opaque refunds | Published prorated refund |
| P6 | Marketing-claim latency | Published P50/P95/P99 + tooltip with methodology |
| P7 | OAuth-key onboarding | Pay → email → key → curl in < 5 min |
| P8 | Unverified bulk lists | SMTP echo + MX + `not_match` over guessed contacts |
| P9 | UI lock-in | API-first; no UI for enriched data |
