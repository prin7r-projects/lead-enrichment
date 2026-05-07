# 07 — Sales strategy

## Motion

**Product-Led Growth (PLG) primary, sales-assist secondary.** Self-serve checkout via NOWPayments hosted invoice covers 90% of expected volume (the Starter and Team tiers). A hand-delivered "pilot" motion handles the first 30 customers and the procurement-driven enterprise buyers (Scale tier and above).

There is **no SDR team**. There is **no outbound**. The founder is the only sales contact for the first 100 customers; after that, we hire a single deal-desk hybrid (engineer + GTM) whose entire job is to support self-serve customers when they want to scale.

## Pricing

Three credit packs, all paid in stablecoins via NOWPayments. One credit = one enriched record (a single `POST /v1/enrich` call that returns a 200). Cached responses do not consume a credit.

| Tier | Credits | USD price | Per-credit | Best for | NOWPayments rail |
| --- | --- | --- | --- | --- | --- |
| **Starter** | 1,000 | **$49** | $0.049 / credit | Founders evaluating + small teams running ≤ 1k enrichments/month | USDT-TRC20 (default), USDC-Polygon, USDC-ERC20 |
| **Team** (most popular) | 10,000 | **$399** | $0.0399 / credit | RevOps engineering teams running 1k–10k enrichments/month | Same |
| **Scale** | 100,000 | **$2,499** | $0.02499 / credit | Series-B and larger running 10k–100k enrichments/month with a 1.5s P95 SLA | Same + USDT-TRC20 quarterly invoice |

**Above 100k credits/month** is custom (contact founder). Custom pricing typically lands at $0.01–$0.02/credit with annual prepay.

**Refund policy.** Prorated to unused credits within 30 days of purchase, refunded to the same payment rail. After 30 days, credits do not expire but are non-refundable. Stated on the FAQ.

**Free pilot.** First 30 customers receive 50 free credits (no card, no commitment) on emailing the founder. Wave 2 ships this as a manual hand-delivery; Wave 3 automates it via a referral-code form.

**Why per-credit, not per-seat.** Per-seat pricing penalizes engineering teams with one engineer wiring the API into a system that serves 100 sales reps. Per-credit aligns the price with the *value delivered* (a verified profile) rather than the *number of people viewing* the data inside someone else's UI.

## Why these specific prices

- **$0.049 / credit at Starter** is competitive with Apollo's per-record pricing on their lowest tier (~$0.06–$0.08 effective per record once you factor in seat costs). It's deliberately undercutting the next-cheapest credible vendor.
- **$0.0399 / credit at Team** is a 19% discount that rewards committing to a quarterly cadence without locking the customer in. This is the tier we expect to dominate.
- **$0.02499 / credit at Scale** is a 49% discount from Starter. It's our enterprise-without-the-enterprise-tax tier. The SLA (≤ 1.5s P95) is a feature of this tier; lower tiers get the same latency in practice but we don't write it into a contract.

## Sales playbook — first 30 customers (Wave 2)

The founder runs every conversation. The playbook:

1. **Inbound trigger.** Email to founder@triangulate.dev or DM via X/LinkedIn or HN comment.
2. **Reply within 4 hours during business hours.** Send a short Loom showing the curl example + a JSON response.
3. **Offer 50 free credits** with no card. Email the API key directly. Ask: "What's the use case? What's the volume?"
4. **Drop into a brief Slack Connect channel** if the customer is at a target ICP. No demo. No deck. Just a place to answer schema and field-coverage questions in real time.
5. **At day 14**, follow up if they haven't bought. Ask: "What did the trial show? What do you need to get to a paid pack?" Resolve the actual blocker — usually it's a missing field, a missing source category, or an integration question.
6. **At purchase**, send a personal thank-you, plus a short Loom showing how to tune confidence-score thresholds for their use case.

Conversion target: 40% of free pilots convert to a paid Starter pack within 30 days. (This is intentionally above the SaaS PLG benchmark of ~20–25% because our self-selection is heavy — the people who email us are pre-qualified by the schema visibility on the landing.)

## Objection handling

### "Your data is small. ZoomInfo has 200M records."
**Response.** Triangulate is per-record-on-demand. We do not maintain a 200M-record database — we enrich the records *you* care about, fresh, with sources. If you need bulk lists, ZoomInfo is the right vendor. If you need verified, fresh, source-linked enrichment of leads you already have, we are.

### "How can you have coverage that high without scraping?"
**Response.** We compose public sources (SEC EDGAR, Companies House, Common Crawl, public LinkedIn, MX records, BuiltWith-style HTML fingerprints, news APIs, job-board feeds). We do not scrape closed-access sources. The coverage percentages on our landing are measured against a benchmark of 1,000 ICP-shape companies; the methodology is published.

### "What about GDPR?"
**Response.** Triangulate processes only public data. Every field we return has a public source URL. We support data-subject deletion requests within 7 days (DPA available; document published in Wave 3). We do not sell our data to third parties; we do not have a marketing affiliate program.

### "Is this AI?"
**Response.** Entity matching uses small classical models (fuzzy string matching, FastText embeddings for company name disambiguation). We do not use generative LLMs in the enrichment pipeline because their hallucination rate is incompatible with confidence + source-linked guarantees. We may use LLMs in Wave 5 for natural-language question answering over enriched profiles — never for the underlying enrichment.

### "Why crypto-only payment?"
**Response.** Honest answer: our merchant-processor stack is in early-stage setup. Stablecoin invoicing via NOWPayments lets us ship a paid product today without a six-month waiting period for a card processor. Card support is on the Wave 3 roadmap (via NOWPayments' fiat-on-ramp partner). For named B2B customers above $5k, we already accept USDT-TRC20 invoicing on Net-30 terms.

### "What's the SLA?"
**Response.** Starter and Team: best-effort, with measured P50 720ms and P95 1,400ms. Scale tier: contractual ≤ 1.5s P95, 99.9% monthly uptime, pro-rated credit refund on miss. Above Scale: custom SLA with named-engineer on-call.

### "Can we have a SOC-2?"
**Response.** Not yet. Wave 4 starts a SOC-2 Type I engagement. Wave 5 targets Type II. For Wave 2 / 3, we can sign your standard MSA and a custom DPA if you provide them; we cannot produce an attestation report.

## Renewal & expansion

- **Starter → Team upgrade**: triggered at 70% credit consumption. Self-serve.
- **Team → Scale upgrade**: triggered when a customer's monthly enrichment volume exceeds 10k for 2 consecutive months. Founder reaches out manually for the first 12 months of the company; automated nudge after that.
- **Annual prepay discount**: 12% off the per-credit rate when a customer pre-buys 12 months of usage in one invoice. Extended to Wave 3 once we have 90 days of usage data to justify the volume forecast.

## Quotas and forecast for Wave 2

| Month | New customers | Avg pack | New MRR (annualized) | Cumulative MRR |
| --- | --- | --- | --- | --- |
| Month 1 | 5 (free pilot) | — | $0 | $0 |
| Month 2 | 8 (pilot → paid) | $200 | $1,600 | $1,600 |
| Month 3 | 15 | $250 | $3,750 | $5,350 |
| Month 4 | 25 | $280 | $7,000 | $12,350 |
| Month 5 | 35 | $320 | $11,200 | $23,550 |
| Month 6 | 45 | $360 | $16,200 | $39,750 |

Six-month run-rate target: ~$40k MRR / ~$480k ARR. Reasonable for a single-founder PLG motion in a category with $20k/year vendor alternatives.
