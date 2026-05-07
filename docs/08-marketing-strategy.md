# 08 — Marketing strategy

## Positioning

**For backend and revops engineers** who need verified, source-linked profiles for outbound and ABM, **Triangulate is a per-credit lead enrichment API** that returns firmographics, decision-maker mapping, technographics, intent signals, and contact triangulation — each field carrying a confidence score and a source URL — **unlike Apollo, ZoomInfo, or Clearbit**, because we ship machine-checkable provenance instead of opaque database confidence and we charge per record, not per seat.

## Messaging hierarchy

```
Hero promise: Verified leads, source-linked, in under 1.5 seconds.
              ─────────────────────────────────────────────────────
                                   │
   ┌───────────────────────────────┼───────────────────────────────┐
   │                               │                               │
Pillar 1                       Pillar 2                       Pillar 3
"Source-linked"                "Per-credit"                   "Drop-in API"
                              
Every field has               Three credit packs.            curl in five lines.
a public-source URL.          No contract.                   Stable schema.
You can verify the            $0.025–$0.049/credit.          Cloudflare Workers,
confidence score              Refund any unused              Bun, Node, Cloudflare.
yourself.                     credits, prorated.              No SDK lock-in.
```

## Content pillars (the three things every piece of content reinforces)

### Pillar 1 — Source-linked confidence
We never ship a confidence score without a source URL. This pillar carries the trust narrative. Every blog post, every thread, every demo includes at least one example of a real source URL appearing in a real response.

Sample headlines:
- *Why every confidence score should ship with a source URL*
- *We measured 1,000 ICP-shape companies. Here's how Triangulate's source-linked enrichment compares to ZoomInfo's black-box scoring*
- *The coverage report nobody publishes — Q2 2026 enrichment honesty*

### Pillar 2 — Per-credit pricing
We're a vendor that publishes prices. This pillar carries the procurement narrative. Every piece of pricing content shows the actual price card, the actual refund policy, and the actual NOWPayments rail.

Sample headlines:
- *We dropped contract-only pricing and grew faster*
- *Why ZoomInfo costs $20k/year and we cost $49 to start*
- *The math: per-seat versus per-credit for a 280-person company*

### Pillar 3 — Drop-in API
We're a developer tool, not a dashboard. This pillar carries the engineering narrative. Every piece of technical content shows real curl, real schemas, and real integration code (Cloudflare Worker, Bun, Hightouch sync).

Sample headlines:
- *Five-line outbound enrichment with a Cloudflare Worker*
- *Why we ship a stable JSON schema instead of an SDK*
- *Triangulate's API design: an opinionated case for `confidence + sources`*

## Channels (mapping to doc 06)

The marketing function ships content into the channels picked in doc 06. Wave 2 channel tier 1 is HN, GitHub, Discord, RevOps Slack. Marketing's job is to keep those channels supplied:

- **Two HN-ready posts** in the first 90 days (one launch Show HN; one technical deep-dive on confidence scoring).
- **One GitHub-ready repo** in the first 90 days: `@triangulate/sdk` with a 5-minute Quickstart.
- **One Postman public collection** in the first 30 days.
- **Founder-led posts** at a cadence of two threads per month on Twitter and LinkedIn.

## Tone — three samples

### Hero copy

> Verified leads, source-linked, in under 1.5 seconds.
>
> Send `{"email":"jane.doe@stripe.com"}`. Get back her current title, her two most recent role changes (with the LinkedIn URLs we used), her company's latest funding round (with the Crunchbase URL), the inferred department, and a confidence score for each field — all before your outbound automation finishes its first await.

### Pricing copy

> Three credit packs. No contract. No seats. Refund prorated to unused credits within 30 days.
>
> One credit = one enriched record. Cached responses don't consume a credit. We pay for the source-layer freshness so you don't pay for stale data.

### Refund FAQ

> **What's your refund policy?** Prorated to unused credits, refunded to the same payment rail (USDT or USDC), within 30 days of purchase. Email founder@triangulate.dev with the order id; expect a reply within one business day.

## What we never write

- *AI-powered enrichment* — we don't claim AI we don't ship.
- *Real-time* without a measured latency — every "real-time" claim must accompany a P95 number.
- *Trusted by [logo wall]* — the proof row is engineering numbers, not logos.
- *Industry-leading* — meaningless.
- *Revolutionary* — meaningless.
- Any sentence longer than 25 words in marketing copy.

## Marketing → product feedback loop

Marketing's content production should drive at least three product changes per quarter:

- **Schema changes.** Threads asking "do you cover X?" surface coverage gaps. We ship the gap, document it on the landing's Coverage matrix, then write a thread about shipping it.
- **Pricing tier changes.** If the Team tier is consistently chosen but customers ask for "half-Team", we ship a Team-Lite pack at 5,000 credits / $229.
- **Field documentation.** Every "what's the difference between confidence X and confidence Y" question becomes a doc entry that we link from the API docs section.

## 90-day marketing calendar

| Week | Output | Channel |
| --- | --- | --- |
| W1 | Show HN: launch | HN |
| W2 | Founder thread: "How we ship confidence + sources" | Twitter, LinkedIn |
| W3 | GitHub: `@triangulate/sdk` v0.1 | GitHub, npm |
| W4 | Postman public collection + tutorial | Postman, Twitter |
| W5–6 | Coverage methodology blog post | triangulate.dev/blog (Wave 3) |
| W7 | RevOps Co-op AMA / office hours sponsorship | Slack |
| W8 | Founder thread: "Why we charge per credit, not per seat" | Twitter |
| W9 | Hightouch / Census integration recipe | Their blog (guest) |
| W10 | Coverage report Q3 2026 (refresh of W5–6) | triangulate.dev/blog |
| W11 | Founder thread: "Three things ZoomInfo gets right" | Twitter |
| W12 | Year-end summary: 90 days, N customers, M enrichments | Twitter, LinkedIn, blog |

## KPIs

| Metric | 90-day target |
| --- | --- |
| Unique landing visitors | 5,000 |
| API key signups (free pilot) | 60 |
| Paid customers | 25 |
| MRR | $5,000 |
| Hacker News front-page appearance | 1 |
| GitHub stars on `@triangulate/sdk` | 50 |
| Postman collection forks | 1,000 |
| Inbound DMs to founder | 50 |
