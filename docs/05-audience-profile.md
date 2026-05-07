# 05 — Audience profile

## Ideal Customer Profile (ICP)

A revenue-operations engineering team — or its 1-person equivalent at a startup — at a B2B SaaS company between Series A and Series C, with the following signals:

- 50–500 employees, $5M–$80M ARR.
- A founder, CEO, or VP of RevOps who insists on owning the enrichment data inside their warehouse (Snowflake, BigQuery, or Postgres) — not inside a vendor's dashboard.
- An outbound motion that runs at least 1,000 enrichments/month and at most 100,000 (above 100k, the buying decision shifts to procurement and we move into the Scale tier — see doc 07).
- A stack that includes at least one of: Hightouch, Census, dbt, Cloudflare Workers, Inngest, Trigger.dev. (These signal an engineer-led ops culture that will value an API-first vendor.)
- A historical pattern of churning *off* one of: ZoomInfo, Apollo, Cognism, Clearbit-Reveal — typically because of pricing rigidity, data staleness, or contract lock-in.

## Persona A — primary

**Name.** Mehdi K.
**Role.** Senior Backend Engineer, "RevOps Engineering" team. Reports into a Director of Engineering with a dotted-line to the VP of RevOps.
**Company size.** Series B, 280 employees, $24M ARR.
**Seniority signal.** 8 years experience; can ship a Cloudflare Worker on a Saturday; reads Postgres EXPLAIN plans for fun.
**Tools daily.** Postman, Linear, Datadog, Cloudflare, Hightouch, dbt, GitHub, terminal.
**Goals.** Replace a hand-rolled enrichment pipeline that stitches three vendors. Cut P95 latency below 1.5s. Make every field auditable.
**Frustrations.** Vendors who hide schemas. 18-month-stale lists. 27-step OAuth dances. Sales calls just to see pricing.
**Channels he reads.** Hacker News, /r/dataengineering, the Hightouch and Cloudflare blogs, Patrick McKenzie's writing on B2B SaaS.
**Buying authority.** Has a $10k discretionary card. Anything below $5k goes through with no friction. Anything above $20k goes through Procurement, who needs SOC-2 evidence.
**What earns his trust.** Engineering numbers (P95 latency, coverage %), real curl examples on the homepage, a published refund policy, and an engineer answering on the founder's LinkedIn within an hour.

**A typical Monday.**

- 09:30 — Stand-up. RevOps mentions outbound campaigns are landing badly because contact data is stale.
- 10:15 — Mehdi opens Postman and tests three enrichment vendors against a list of 20 known-good leads. Two of three return wrong job titles for at least 4 of the 20. He cancels both POCs.
- 11:30 — He reads a Hacker News thread linking Triangulate as "the only one that returns source URLs." Clicks through.
- 11:35 — He sees the curl example, runs it from his terminal, gets a 720ms response. Puts it on the team's evaluation list.
- 14:00 — He buys a Starter pack ($49). Wires the API into a Cloudflare Worker. Ships to staging by EOD.

## Persona B — secondary

**Name.** Hannah O.
**Role.** Founding GTM operator. Reports directly to the CEO. Is the entire RevOps function.
**Company size.** Seed-stage, 12 employees, $400k ARR.
**Seniority signal.** 6 years in early-stage operations; SQL-fluent; Python-curious; doesn't ship code daily but can.
**Tools daily.** Notion, HubSpot, Apollo (begrudgingly), Google Sheets, Slack, LinkedIn Sales Nav, Mixmax.
**Goals.** Send 500 well-targeted outbound emails per week without paying $20k/year for ZoomInfo. Trust her enrichment vendor enough to brief the CEO on a deal.
**Frustrations.** Tools designed for 100-person sales teams. Forced annual contracts. Mystery-box AI scoring. 7-day trials with credit cards required up-front.
**Channels she reads.** SaaStr, RevOps Co-op (Slack), founder-led Substacks, ProductHunt.
**Buying authority.** Has the corporate card. CEO authorizes anything under $200/month without question.
**What earns her trust.** A pricing page that doesn't say "Contact us." A founder she can reach in WhatsApp. A clear FAQ.

**A typical Tuesday.**

- 08:30 — Hannah reads a SaaStr blog post about how early-stage outbound dies. She clicks through to a sidebar mention of Triangulate.
- 08:35 — She lands on the Pricing section directly via a deep-link anchor. Sees three credit packs. Compares to Apollo's seat-priced quote.
- 08:42 — She emails the founder asking for a 50-credit pilot.
- 11:00 — She gets a key + a Loom showing how to call the API from a Google Sheets formula via Apps Script.
- 12:30 — She runs 50 enrichments. 49 return verified. 1 returns "no_match" (instead of a guess). She notices and trusts that.
- 16:00 — She buys the Starter pack on day 14 once the trial is exhausted.

## Anti-persona A — "the bulk-list buyer"

**Name.** Tom B.
**Role.** SDR Manager at a 600-person services company.
**Why he's not our customer.** He wants a CSV of 50,000 verified contacts in his ICP for $500. He does not care about per-field provenance, freshness windows, or refund policies. He wants the lowest possible price per row, and he is willing to send to scraped, guessed addresses to make his quota.

**Why we say no.** Selling to Tom means our sender reputation collapses by month 6 and our genuine engineer-customers get caught in spam-filter collateral damage. Tom belongs to Apollo's bulk-package SKU, not to us.

## Anti-persona B — "the procurement-only enterprise buyer"

**Name.** Diane S.
**Role.** Strategic Sourcing Director at a 12,000-person Fortune 500.
**Why she's not our customer (yet).** She demands SOC-2 Type II, a 9-figure indemnification clause, a custom MSA, and a $300k annual contract on Net-90 terms. We will not be able to support her until Wave 6 at the earliest.

**Why we say no, politely.** We do an honest "we're not a fit yet — here's our trust roadmap; come back in 12 months" conversation. We do not chase the contract.

## Anti-persona C — "the LinkedIn-Sales-Nav-replacement seeker"

**Name.** Priya R.
**Role.** Recruiter at a tech staffing firm.
**Why she's not our customer.** She wants to sift through LinkedIn profiles for sourcing candidates — that is, she wants a *passive search* tool, not an *active enrichment* API. Our product does not surface arbitrary "people in finance who switched jobs in the last 90 days." It returns a profile *for a specific lead identifier*. The use cases are adjacent but the right tool for her is a passive-search platform like Gem or hireEZ.
