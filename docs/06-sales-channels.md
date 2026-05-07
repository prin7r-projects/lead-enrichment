# 06 — Sales channels

Channel mix is engineer-led: we pull buyers in through technical artifacts (a curl, a JSON schema, a latency number), not through outbound. Marketing's job is to make sure the right HN thread, the right SaaStr article, and the right developer Discord all surface Triangulate when an engineer is actively shopping.

## Channel scorecard

| Channel | Audience fit | Acquisition cost | Time-to-first-value | Wave 2 priority |
| --- | --- | --- | --- | --- |
| Hacker News (Show HN, Ask HN, comment threads) | Mehdi-persona perfect | Low (founder time) | Hours | **Tier 1** |
| Engineering-led developer Discords (DBT, Hightouch, Inngest, Modal) | Mehdi-persona high | Low (founder time) | Days | **Tier 1** |
| GitHub (open-source npm clients, README links) | Mehdi-persona high | Low (engineering time) | Weeks | Tier 1 |
| RevOps Co-op Slack | Hannah-persona high | Low (community time) | Days | Tier 1 |
| SaaStr / GTM blog guest posts | Hannah-persona high | Medium (writer fee) | Weeks | Tier 2 |
| Postman public collections + tutorials | Mehdi-persona high | Low | Hours | Tier 2 |
| Twitter / LinkedIn personal posts (founder-led) | Both personas medium | Low (founder time) | Days | Tier 2 |
| Sponsored newsletters (DataElixir, Last Week in AWS, RevOps Cloud) | Both personas medium | Medium ($1k–$5k/issue) | Weeks | Tier 3 |
| Paid Google search (`enrichment api`, `clearbit alternative`) | Both personas medium | Medium-high ($3–$8 CPC) | Hours | Tier 3 (Wave 4) |
| ProductHunt launch | Hannah-persona medium | Low (founder time) | One-day spike | Tier 3 (Wave 3) |
| Outbound to RevOps directors | Mehdi-persona low (we're playing into their tools) | High | Weeks | **Skip** |

## Tier 1 channels (Wave 2)

### Hacker News
**Why.** Mehdi reads HN. He reads it during stand-up break. The post that surfaces a real curl, a real schema, and a real latency number is the post that gets upvoted into the front page.
**Plan.** A "Show HN: Triangulate — a per-credit lead-enrichment API with source-linked confidence" post on the day we ship the landing. Founder is on the thread for 24 hours answering schema and pricing questions.
**Metric.** 200+ upvotes, 30+ comments on the launch thread; 500+ unique visits to the landing in week 1.

### Engineering-led developer Discords
**Why.** Hightouch and Inngest's Discords are full of engineers building outbound and ABM pipelines. They ask "what's the best vendor for X" weekly. A founder-presence in those communities — answering schema-level questions, posting our docs when relevant — converts.
**Plan.** Founder joins 5 Discord communities (Hightouch, Inngest, dbt-Labs, Modal, RevOps Co-op). Posts our launch as a comment in the introductions channel. Answers any "enrichment API" question for 90 days.
**Metric.** 20+ inbound DMs requesting an API key in the first 30 days.

### GitHub (open-source npm clients)
**Why.** A `@triangulate/sdk` package on npm is a discovery surface — when an engineer searches `lead enrichment npm`, they find our official client. The README is also our docs.
**Plan.** Ship `@triangulate/sdk` (Node + Bun + Cloudflare Workers compatible) in Wave 2 polish. Five-minute Quickstart. MIT-licensed. Open-source.
**Metric.** 50+ GitHub stars in the first 60 days; a referenced mention in a popular outbound-tooling repo.

### RevOps Co-op (Slack community)
**Why.** Hannah lives there. The community has a `#tools` channel where members ask for vendor recommendations weekly. Triangulate's per-credit pricing is unusual enough to generate organic recommendations.
**Plan.** Founder joins. Doesn't sell. Answers questions about our schema, pricing, and refund policy when asked. Sponsors one of their monthly office-hours sessions ($500).
**Metric.** 10+ pilot signups attributed to the community in 90 days.

## Tier 2 channels (Wave 2 → Wave 3)

### SaaStr / GTM blog guest posts
**Why.** Hannah-persona reads SaaStr. A guest post titled "How to evaluate enrichment vendors without taking a sales call" — written by a respected RevOps practitioner, with Triangulate as one of three example vendors compared on schema, latency, pricing — converts both personas.
**Plan.** Commission one guest post per quarter for $500–$1500. Place in SaaStr, Hightouch's blog, or RevOps Co-op's blog.
**Metric.** Each post drives 200+ unique visits and 5+ pilot signups within 30 days of publication.

### Postman public collections + tutorials
**Why.** Engineers who shop for an API often start in Postman. A public Triangulate collection with three pre-built requests (single enrichment, coverage, healthz) is a 2-click "try it now" surface.
**Plan.** Ship the collection in Wave 2 polish. Include a tutorial: "From zero to first enrichment in 5 minutes."
**Metric.** 1,000+ collection forks in 90 days.

### Founder-led personal posts (Twitter, LinkedIn)
**Why.** A founder who can write a thread breaking down the engineering tradeoffs of running an enrichment API at sub-1.5s P95 will earn engineer-trust faster than any marketing campaign.
**Plan.** Two threads per month. Topics: "Why we ship per-field source URLs," "How we measure freshness," "Three things ZoomInfo gets right and three things they don't." Each thread cites Triangulate but isn't a pitch — it's a real argument.
**Metric.** 5,000+ impressions per thread; 10+ inbound DMs from founders/engineers in 90 days.

## Tier 3 channels (Wave 4+)

Sponsored newsletters and paid search are deliberately deferred to Wave 4 because they require Wave 2 product evidence (a working landing, a published pricing page, real customer testimonials) to convert at acceptable CACs.

ProductHunt launch is reserved for Wave 3 once we have a 10–15 person paying customer base and at least three short testimonials.

## Skip — outbound to RevOps directors

**Why we're skipping this.** Outbound to RevOps directors is a "buy from us because we cold-called you" motion. It contradicts our value proposition (we replace cold-call procurement with self-serve API). Sending cold emails to RevOps directors is also exactly what our customers will do *with* our enrichment data — making us a one-time vendor instead of a recurring infrastructure dependency.

We will accept inbound from procurement-driven enterprise buyers (the Mehdi-company-procurement journey in doc 03), but we will not source those buyers via outbound.

## Channel-by-persona acquisition flow

```
Mehdi (primary)        Hannah (secondary)
────────────────       ──────────────────
HN Show post           SaaStr guest post
↓                      ↓
Reads schema           Lands on pricing
↓                      ↓
Runs curl              Emails founder
↓                      ↓
Buys Starter           Receives pilot key
↓                      ↓
Wires Worker           Pays Starter at day 14
↓                      ↓
Upgrades Team          Refers founder peers
```

Both flows converge on the same self-serve checkout (NOWPayments invoice → API key) with a hand-delivered pilot fallback for the first 30 customers.
