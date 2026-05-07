# 01 — Brand identity

## Brand pyramid

- **Essence (one word).** Triangulation.
- **Personality (three traits).** Precise. Instrumented. Earnest.
- **Values (three).** Verifiability over volume. Sources over confidence theater. Per-credit honesty over retainer lock-in.
- **Attributes (five).** Source-linked. Latency-bounded. Engineer-shaped. Quietly opinionated. Unflinchingly transparent.

## Positioning statement

For backend and revops engineers who need verified, source-linked profiles for outbound and ABM, **Triangulate** is a per-credit lead enrichment API that returns firmographics, decision-maker mapping, technographics, intent signals, and contact triangulation, each field carrying a confidence score and a source URL — unlike Apollo, ZoomInfo, or Clearbit, because we ship machine-checkable provenance instead of opaque database confidence and we charge per record, not per seat.

## Audience persona — primary

**Name.** Mehdi K., Senior Backend Engineer, "RevOps Engineering" team at a 280-person Series B.

**Goals.** Replace a hand-rolled enrichment pipeline that stitches three vendors together. Cut P95 enrichment latency below 1.5 s. Make every field auditable so the GTM team stops "winging it" on outreach copy.

**Frustrations.** Vendors hide their schema behind a sales call. Bulk lists arrive 18 months stale. Refund policies are vague. Auth is a 27-step OAuth dance for a single API key. The pricing table starts at "Contact us."

**Channels.** GitHub. Hacker News. /r/dataengineering. Postman tutorials. Datadog blog. Engineering-led discord servers (DBT, Hightouch, Prefect).

## Audience persona — secondary

**Name.** Hannah O., founding GTM operator at a 12-person seed-stage startup.

**Goals.** Send 500 well-targeted outbound emails per week without paying $20k/year for ZoomInfo. Trust her enrichment vendor enough to use the data in her CEO's pitch deck without re-checking every cell.

**Frustrations.** Tools designed for 100-person sales teams. Forced annual contracts. Mystery-box "AI scoring" with no explanation. Free trials that expire after seven days but require credit cards on file from day one.

**Channels.** SaaStr blogs. RevOps Co-op. LinkedIn (passive). Founder-led Substacks. ProductHunt.

## Voice & tone

**Three do's.**

1. Lead with a number. "P50 latency 720ms. Coverage 94% NA, 81% EMEA. Refresh window 28 days." Specifics signal confidence the way "blazing-fast" never does.
2. Quote our own JSON. The hero is a real curl, a real response. Engineers trust syntax they can paste into a terminal.
3. Cite the source, every time. "From the company's most recent 10-K, filed 2026-04-12." A footnote beats a marketing claim.

**Three don'ts.**

1. Never use the word "intelligent" as a substitute for "we don't want to explain the algorithm."
2. Never write an em-dash sentence that could be a bullet. RevOps engineers skim.
3. Never claim "AI-powered" without naming the model, the prompt scaffold, and the eval set. We use small, classical models for entity matching; we say so.

**Sample sentence.**

> Send `{"email":"jane.doe@stripe.com"}`. Get back her current title, her two most recent role changes (with the LinkedIn URLs we used), her company's latest funding round (with the Crunchbase URL), the inferred department, and a confidence score for each field — all in under 1.5 seconds.

## Visual system

**Palette (5 colors, role-labeled).**

| Hex | Role | Notes |
| --- | --- | --- |
| `#0E1216` | Surface | Page background, deep slate — the "instrument panel" |
| `#161B22` | Surface raised | Cards, code-sample frames |
| `#F4F1EA` | Surface inverse | Pricing strip, footer — warm off-white "paper" |
| `#F2A03D` | Accent | Single signal color — links, focus rings, primary CTA |
| `#E8E6E0` | Ink | Body text on dark; muted variant `#8E8B82` for eyebrows |

The amber (`#F2A03D`) is the only chromatic color in the system. Everything else is slate or ink. This constraint enforces the "instrument" feel and keeps marketing language honest — there is no second accent to lean on for visual pizzaz.

**Typography pair (3 typefaces).**

- **Fraunces** (display, optical-size axis) — used **only** in the hero headline. Optical size 144 (`opsz`), tracking -0.02em, weight 400. The serif gives the page one moment of "instrument-grade" gravity that a sans never could.
- **Inter** (UI / body) — every paragraph, button, table cell, navigation item. Weights 400, 500, 600.
- **JetBrains Mono** (code / numerals) — eyebrow type, JSON viewer, latency digits, credit prices. Weights 400, 600. JetBrains Mono is chosen over Fira Code or IBM Plex Mono for its slightly heavier x-height, which holds at small sizes.

All three load via `next/font/google` from the same origin so the FOIT is zero.

**Logo concept.**

Three intersecting amber line segments forming a triangle — a literal triangulation. The cross-points are the only "ink" in the mark. Inline SVG only; no PNG. The mark renders correctly at 16, 20, 24, and 32 px without rasterization. Stroke 1.5px on a 24×24 viewbox.

```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="#F2A03D" stroke-width="1.5" stroke-linecap="round" fill="none">
    <line x1="12" y1="3" x2="3" y2="20" />
    <line x1="12" y1="3" x2="21" y2="20" />
    <line x1="3" y1="20" x2="21" y2="20" />
    <circle cx="12" cy="3" r="1.25" fill="#F2A03D" />
    <circle cx="3" cy="20" r="1.25" fill="#F2A03D" />
    <circle cx="21" cy="20" r="1.25" fill="#F2A03D" />
  </g>
</svg>
```

**Spacing & radius scale.**

- 4px base grid; primary units `16px` and `32px`.
- Radius: `4 / 8 / 12` for badges / buttons / cards. `999` for pills only.
- Borders: 1px, solid, single token (`#22272E` on dark, `#D7D3CB` on paper).

**Motion principles.**

- Default duration 150ms, `ease-out`.
- The accent darkens on hover. Buttons translate 1px upward — no scale, no glow.
- `prefers-reduced-motion: reduce` collapses every transition to 0ms.
- No autoplay. No parallax. No scroll-jacking.

## Forbidden moves (recorded so the next agent doesn't drift)

- No second chromatic color. No purple, no blue, no teal accents.
- No gradient backgrounds. The surface is solid `#0E1216`.
- No marketing screenshots of dashboards we don't ship. The hero is a real curl on the real API.
- No "Trusted by [logo wall of fortune 500 companies we have not closed]." The proof row is latency, coverage, and freshness, not logos.
