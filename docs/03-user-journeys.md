# 03 — User journeys

Three journeys, each tracking a real persona from doc 05 from first contact to recurring use. Every step names the surface (landing section, API endpoint, or external channel) so the team can instrument it.

## Journey A — Backend engineer, technical evaluation (Mehdi K., primary persona)

### Discovery (≤ 5 minutes)
1. Mehdi sees a Hacker News comment thread mentioning "Triangulate" alongside Apollo and Clearbit. He clicks through.
2. The landing's hero shows a `curl` request and the JSON response. He doesn't have to read marketing copy to learn the schema.
3. The "Proof row" shows P50 720ms, coverage 94% NA, refresh window 28d. He recognizes these as honest engineering numbers.
4. He scrolls to the "Coverage matrix" — six cells, each with a coverage percentage. He knows immediately whether intent signals are in scope (yes) and whether SMTP echo is included (yes).

### First value (≤ 30 minutes)
5. He clicks "Get API key" in the header. The CTA scrolls to the Pricing section (the credit-pack cards).
6. He picks the Starter pack (1,000 credits / $49). Clicks "Pay with crypto" → NOWPayments hosted invoice. Pays with USDT-TRC20 from a sandbox wallet.
7. He receives an email (mocked in Wave 2; live in Wave 3) with his API key and a curl example.
8. He copies the curl from the API docs section, runs it from his terminal, and gets a response in 720ms.
9. He runs five more enrichments to validate the schema is stable; the 6th request hits the cache and returns in 41ms.

### Recurring use (within 7 days)
10. He wires `POST /v1/enrich` into his outbound pipeline (Cloudflare Worker → Triangulate → Hightouch sync to Salesforce).
11. He builds a coverage dashboard internally using the per-field `confidence` and `sources` arrays so his GTM team can see *why* a row was flagged low-confidence.
12. He upgrades to the Team pack (10,000 credits / $399) on day 5 because his usage is climbing.

**Friction surfaces.** The signup-without-account flow (NOWPayments invoice → email) is novel. We mitigate by showing the credit-pack-to-API-key sequence on the pricing card itself.

## Journey B — Founder-operator, pragmatic adoption (Hannah O., secondary persona)

### Discovery (≤ 3 minutes)
1. Hannah reads a SaaStr blog post on "How early-stage outbound dies" that links Triangulate as a counter-example.
2. She lands directly on the Pricing section because the deep-linked anchor `#pricing` is in the blog post.
3. She compares the Starter pack ($49 / 1k credits) against ZoomInfo's $20k/year minimum. The math is immediate.

### First value (≤ 1 hour)
4. She doesn't write code. She clicks "Pay with crypto" out of curiosity — and the FAQ reassures her that we will accept card via fiat-on-ramp partners in Wave 3.
5. She emails sales@triangulate.dev (mailto link in the footer) asking for a no-card pilot of 50 free credits. (Wave 2: this is a real inbox routed to the founder; we hand-deliver keys for the first 30 customers.)
6. She receives a key within a day, plus a short Loom showing how to call the API from a Google Sheets formula via Apps Script.
7. She runs 50 enrichments on a list of 50 prospects she scraped from a niche industry directory. 49 return verified; 1 returns "no_match" (we honestly say so — no fake confidence).

### Recurring use (within 30 days)
8. She buys the Starter pack on day 14 once her trial is exhausted.
9. She comes back monthly. Her usage stays under 1,000 credits/month, which is the entire Starter pack.
10. She refers Triangulate inside her founders' WhatsApp group; two more founders sign up with referral codes (Wave 3 feature).

**Friction surfaces.** The Google-Sheets-via-Apps-Script integration isn't documented in the API docs section yet — Wave 3 ships a "Sheets recipe" page.

## Journey C — Procurement-driven enterprise pilot (Mehdi's company, 6-month horizon)

### Discovery (≤ 1 day)
1. Mehdi's manager (a director of engineering) sees Triangulate in his quarterly tooling review. She runs `curl` herself to verify the API exists and isn't behind a "Talk to sales" wall.
2. She emails the founder at triangulate.dev to start a procurement conversation.

### First value (within 14 days)
3. We ship a Mutual NDA and a Letter of Intent within 48 hours.
4. We provide 5,000 credits as a paid pilot (Scale pack, $2,499) with a written 30-day refund clause if average P95 latency exceeds 2.0s.
5. Mehdi's team integrates Triangulate alongside their existing Clearbit contract (parallel-run, not replace) for two weeks.
6. We ship them a CSV of every enriched record with the `confidence` and `sources` arrays for their compliance review.

### Recurring use (months 2–6)
7. Triangulate replaces Clearbit on month 3 after the parallel-run shows our coverage is within 2 percentage points and our cost per record is half.
8. They sign an annual contract for 200,000 credits ($16,000/year, ~$0.08/credit) — billed via NOWPayments USDT-TRC20 invoice quarterly. Net-30 invoicing.
9. Their RevOps team builds a Looker dashboard on top of the `confidence` distribution to track outbound list health.

**Friction surfaces.** Procurement teams sometimes want SOC-2 evidence; we will produce a "Trust" page in Wave 4 with our subprocessor list, data-handling policy, and current evidence (penetration test summary, encryption-at-rest claim, etc.).

## Cross-journey checkpoints

Every journey hits the same five trust checkpoints, in order. We instrument each one:

| Checkpoint | Surface | Wave 2 instrument |
| --- | --- | --- |
| Schema legibility | Hero + API docs section | Direct measurement: did they scroll to docs? |
| Honest numbers | Proof row | Hover/click on the latency stat → tooltip with measurement methodology |
| Source visibility | Response example | The example shows real source URLs (anonymized but plausible) |
| Pricing transparency | Pricing section | All three tiers visible without "Contact sales" gate |
| Refund clarity | FAQ | A direct question: "What is your refund policy?" — answered: prorated to unused credits within 30 days. |
