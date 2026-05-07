# 09 — Go-to-market

A 90-day plan from the day the landing goes live (Day 0) through Day 90. The plan ships product, marketing, and sales artifacts in parallel; each milestone is binary (done / not done) so we can read the calendar at a glance.

## Day 0 — Launch readiness checklist

Done before publishing the Show HN post:

- [x] Landing live at `lead-enrichment.prin7r.com` — HTTPS 200, valid Let's Encrypt cert.
- [x] API live at `lead-enrichment.prin7r.com/v1/enrich` and `/healthz` — both return 200 for valid bodies.
- [x] DESIGN.md committed with all 15 sections.
- [x] All 10 strategy docs in `/docs/` and as Notion sub-pages of the opportunity.
- [x] NOWPayments invoice route stubbed at `/api/checkout/nowpayments` (returns 503 with `missing_env` if API key absent — production-acceptable).
- [x] NOWPayments IPN webhook at `/api/webhooks/nowpayments` with HMAC-SHA512 verification.
- [x] Desktop (1440×900) and mobile (390×844) screenshots captured from the deployed surface.
- [x] FAQ answers all five "trust checkpoints" from doc 03.
- [x] Pricing section visible without auth, with three tiers and per-credit prices.

## Week 1 — Public launch

**Day 1–2.** Founder writes and posts Show HN: *"Triangulate — per-credit lead enrichment with source-linked confidence."* Post body includes:
- A real curl with a real response.
- The four engineering numbers (P50, P95, coverage NA/EMEA, refresh window).
- A link to the public Postman collection.
- The pricing card image.

Founder spends 24 hours on the thread answering schema, pricing, methodology, and competitive questions.

**Day 3–4.** Founder threads on Twitter and LinkedIn:
- Thread 1: *"How we ship confidence + sources" — a 7-tweet engineering thread with screenshots of the actual JSON.*
- Thread 2: *"Why per-credit, not per-seat" — a 5-tweet pricing thread.*

**Day 5–7.** Founder joins five engineering Discords (Hightouch, Inngest, dbt, Modal, RevOps Co-op). Posts launch as a comment in `#showcase` or `#launches`. Does not pitch in `#general`.

**Week 1 success bar.**
- 200+ HN upvotes.
- 1,000+ unique landing visits.
- 20+ free pilot signups.

## Week 2–4 — First 30 customers

The hand-delivery sales motion described in doc 07 §"Sales playbook — first 30 customers." Founder runs every conversation. Goal: 30 free pilots issued, 8 paid Starter packs.

Concurrent product work:
- Ship `@triangulate/sdk` v0.1 (Node + Bun + Cloudflare Workers).
- Add a `/v1/coverage` meta endpoint listing supported regions and freshness.
- Add Hightouch + Census integration recipes to the API docs section.

**Week 4 success bar.**
- 30+ free pilots issued.
- 8+ paid customers.
- $1,000+ MRR (annualized).
- 50+ GitHub stars on the SDK.

## Week 5–8 — Schema honesty post

The marketing differentiator that earns mid-funnel trust:

**Week 5.** Run a measured benchmark of 1,000 ICP-shape companies through Triangulate, ZoomInfo (via a customer's account), Apollo, and Clearbit. Record the per-field coverage and per-field confidence-vs-actual error rate.

**Week 6.** Write the methodology + results post. Title: *"The coverage report nobody publishes — Q2 2026 enrichment honesty."* Publish to:
- `triangulate.dev/blog/coverage-q2-2026` (Wave 3 blog surface; in Wave 2, publish as a long Notion doc linked from the landing).
- Twitter as a thread summarizing the headline numbers.
- HN as a "Show HN" follow-up.

**Week 7.** Convert the post into a guest article on Hightouch's blog, framed as "How we evaluate enrichment vendors at Hightouch."

**Week 8.** Run the *first* RevOps Co-op office-hours session. Founder + customer (with permission) walk through wiring Triangulate into a Hightouch sync.

**Week 8 success bar.**
- Coverage report published, 5,000+ reads.
- Hightouch guest post live.
- 20+ paying customers.
- $4,000+ MRR.

## Week 9–12 — Scale tier first signed

The third month focuses on landing the first procurement-driven enterprise customer (the Mehdi-company-procurement journey from doc 03). The discipline: do not chase. Continue self-serve PLG; respond to inbound procurement conversations within 4 hours.

**Week 9.** Founder thread: *"Three things ZoomInfo gets right and three things they don't."* Public, even-handed, designed to attract prospects who are evaluating both.

**Week 10.** Hightouch / Census integration recipe blog post (with their permission) lives on their blog, linking back to Triangulate's docs.

**Week 11.** Re-run the coverage benchmark with a fresh 1,000 ICP-shape sample; update the coverage page on the landing.

**Week 12.** Year-end summary post: *"Day 0 to Day 90 — N customers, M enrichments, $X MRR."* Public on Twitter, LinkedIn, and Notion. The point is to demonstrate growth, not to brag.

**Week 12 success bar.**
- 25+ paying customers.
- $5,000+ MRR.
- 1+ Scale tier paid pilot in flight.
- 1+ Hacker News front-page appearance (the launch + at least one secondary post).

## Risks and mitigations

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| HN launch flops | Medium | Founder has 24h of time blocked; prepared a "Show HN, take 2" follow-up at Week 4. |
| NOWPayments invoice has a bug under load | Low | Tested in payments-prototypes; we will keep direct USDT-TRC20 invoice as a manual fallback for first 30 customers. |
| Source-layer fan-out hits a rate limit | Medium | Wave 2 ships deterministic-stub responses; real source layer comes Wave 3 with caching and rate-limit awareness. |
| GDPR/CCPA inquiry | Low | DPA doc planned for Wave 3 W4; for Wave 2, we have a one-paragraph public-data position statement on the FAQ. |
| SOC-2 demand from enterprise prospect | High at Scale tier | We say "not yet, here's our roadmap" and continue. We do not skip Wave 3 to chase Wave 6 evidence. |

## Launch sequence (Day 0 hour by hour)

```
T-72h  → Final QA: landing screenshots, API curl, pricing CTA → NOWPayments invoice
T-48h  → Schedule Show HN post for Tuesday 09:00 UTC (best slot for SF + NYC overlap)
T-24h  → Pre-warm Twitter audience: post the proof row as a screenshot, no link
T-2h   → Final landing health check: curl https://lead-enrichment.prin7r.com/healthz
T-0    → Submit Show HN. Title: "Triangulate — per-credit lead enrichment with source-linked confidence"
T+0    → Founder available in the thread for 24h.
T+15m  → First Twitter thread.
T+1h   → First LinkedIn post.
T+2h   → First Discord post (Hightouch).
T+4h   → Reply to all inbound DMs.
T+24h  → Wrap-up summary post on Twitter.
```
