# DESIGN.md — Triangulate

Canonical design + style guide for the Triangulate lead-enrichment service. Owned by Chief of Design. Kept in sync with `apps/landing/` and `apps/api/`. Reviewers should treat any drift between this file and the deployed surface as a defect.

---

## 1. Product and audience

**Product.** Triangulate is an API-first lead enrichment service. Engineers and RevOps teams send a lead identifier (email, domain, name + company) and receive a structured, source-linked profile: firmographics, decision-maker mapping, technographics, intent signals, and contact triangulation. Every field is shipped with a confidence score (0.0–1.0) and at least one source URL. Pricing is per credit; one credit = one enriched record. There is no retainer, no minimum spend, and no UI lock-in.

**Primary audience.** Backend engineers and revops engineers building outbound, ABM, or sales-intelligence pipelines. They live in Postman, terminal, and Datadog. They distrust any vendor whose docs hide the response schema behind a marketing form. Their week is measured in P95 latency, freshness, and coverage.

**Secondary audience.** Founder-operators in a series-A or earlier company who do their own outbound. They want a reliable enrichment dependency they can drop into a Cloudflare Worker or Bun script without negotiating a six-month contract. They care about the credit price and the per-record refund rule.

**What we are not.** We are not a list-builder. We do not sell scraped, unverified bulk databases. We do not chatbot-cover the API. We do not run on AI-marketing-blue gradients.

---

## 2. Visual positioning

The visual system reads as **a calibrated instrument** — closer to a Bloomberg terminal cross-bred with Stripe's API documentation than a marketing landing page. The hero is a working `curl` request and its real JSON response. Numbers — P50 latency, coverage percentage, freshness window — are first-class typography, not chart eye-candy.

Reference points (we draw inspiration; we do not copy):

- **Stripe API docs** for code-sample primacy and split-pane layouts.
- **Mercury Bank** for trust through restraint and serif accents on financial copy.
- **Linear** for the discipline of monochrome surfaces with one decisive accent.
- **Figma's developer reference site (figma.com/developers)** for clean coverage matrices.

Anti-references (explicitly avoided):

- AI-sales gradient blue/purple, "rocket" hero illustrations, animated 3D blobs, chatbot bubbles, cartoon laptop mockups.
- Hand-drawn doodles. Dark-mode-only sites. "Let's chat" CTA pills.

---

## 3. ShadCN baseline and local component policy

We are on the **shadcn/ui** baseline (Radix primitives + Tailwind CSS, opted-in via `pnpm dlx shadcn@latest add <component>`). Every imported primitive is project-owned: the source lands in `apps/landing/components/ui/` and is reviewed like first-party code.

Components used in `apps/landing/`:

- `button` — every CTA, navigation triggers
- `card` — pricing tiers, coverage matrix cells, code-sample frame
- `badge` — status pills (Live, Stable, Beta), credit-pack labels
- `tabs` — request/response toggle in hero, pricing currency toggle
- `accordion` — FAQ section
- `separator` — subtle section dividers
- `tooltip` — confidence-score inline explanations

**Exceptions to the baseline.**

- The hero `CodeSample` component is project-local (`apps/landing/components/code-sample.tsx`). It is not a ShadCN primitive; it composes ShadCN `tabs` and `card` with Highlight.js-style monochrome syntax tokens we author ourselves.
- The `CoverageMatrix` and `LatencyMeter` components are project-local. They use our Tailwind tokens but no third-party UI dependencies.

No paid pro libraries. No Material UI, MUI, Chakra, NextUI. All marketing flair (e.g., the underlined-link hover, the eyebrow caret) is hand-rolled in Tailwind so we own the source.

---

## 4. Color tokens

Triangulate uses a constrained five-color system: a deep slate surface, a signal amber accent, two ink shades, and a single muted neutral. The amber is the only chromatic color in the system — every diagram, hover state, focus ring, and credit-balance dot uses it.

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Surface (page) | `--surface` | `#0E1216` | Page background; card backgrounds use this with a 1px ink border |
| Surface raised | `--surface-raised` | `#161B22` | Cards, code blocks, modal bodies |
| Surface inverse | `--surface-inverse` | `#F4F1EA` | The "paper" alt scheme (pricing strip, footer, mobile sheet) — warm off-white |
| Ink primary | `--ink` | `#E8E6E0` | Body text on dark surfaces |
| Ink muted | `--ink-muted` | `#8E8B82` | Captions, eyebrow, JSON keys |
| Ink inverse | `--ink-inverse` | `#1A1F26` | Body text on light surfaces |
| Accent (signal) | `--signal` | `#F2A03D` | Single accent — links, focus ring, primary CTA, status dot, sparkline |
| Accent shadow | `--signal-shadow` | `#B16E1F` | Hover/active state of accent surfaces |
| Border | `--border` | `#22272E` | All borders on dark; 1px solid only |
| Border inverse | `--border-inverse` | `#D7D3CB` | Borders on the paper scheme |
| Success | `--ok` | `#7AA17A` | "Verified" badge, 200 status pill — desaturated sage, not pure green |
| Warn | `--warn` | `#D49A4A` | Aged-data badge — same family as accent, slightly muted |
| Error | `--err` | `#C26A5A` | 4xx/5xx, low confidence — earthy red, never pure red |

WCAG AA enforced for body text on every surface (verified in section 12).

---

## 5. Typography

Three typefaces, each with a deliberate role. Loaded via `next/font/google` in `apps/landing/app/layout.tsx` so the FOIT is zero and the bytes ship from the same origin.

| Role | Family | Weights | Used for |
| --- | --- | --- | --- |
| Display | Fraunces (serif, optical-size axis) | 400, 600 | The hero headline only — single appearance per page; communicates "instrument-grade" |
| Body / UI | Inter (sans-serif) | 400, 500, 600 | All paragraph copy, nav, buttons, table cells |
| Mono / Code | JetBrains Mono | 400, 600 | Eyebrows, code samples, JSON viewer, latency numbers, credit-pack pricing digits |

Type scale (`rem` on a 16px root):

- `text-eyebrow` — `0.75rem / 0.95`, JetBrains Mono 600, uppercase, +0.08em tracking
- `text-caption` — `0.8125rem / 1.4`, Inter 400
- `text-body` — `1rem / 1.55`, Inter 400
- `text-lead` — `1.125rem / 1.5`, Inter 400
- `text-h3` — `1.375rem / 1.25`, Inter 600
- `text-h2` — `1.875rem / 1.15`, Inter 600
- `text-h1-display` — `3.5rem / 1.05`, Fraunces 400, optical-size 144 (`opsz` axis), -0.02em tracking
- Mobile clamp: `text-h1-display` collapses to `2.25rem / 1.1` at < 640px

All headlines use sentence case — never title case, never all-caps. Eyebrows are uppercase mono; they are the *only* uppercase type in the system.

---

## 6. Spacing, radius, shadows, and borders

Spacing scale is a 4px grid, expressed in Tailwind tokens (`1` = 4px, `2` = 8px, etc.). The two most-used units are `4` (16px — base inline gap) and `8` (32px — section vertical rhythm).

| Token | Value | Use |
| --- | --- | --- |
| `radius-sm` | 4px | Badges, status pills |
| `radius-md` | 8px | Buttons, inputs, cards |
| `radius-lg` | 12px | Hero panels, code-sample frames |
| `radius-pill` | 999px | Credit-balance pill, header CTA |

**Shadows are forbidden on dark surfaces.** Depth is conveyed by 1px `--border` lines and a 1px inner highlight on raised cards (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.04)`). On the paper scheme, a single elevation level is permitted: `0 1px 0 rgba(26,31,38,0.06), 0 8px 24px -16px rgba(26,31,38,0.18)`.

Borders are always 1px, always solid, always `--border` (or `--border-inverse`). No 2px borders. No dashed borders except for the "drop-zone" upload state in the future bulk-enrichment flow.

---

## 7. Layout system and responsive rules

Twelve-column CSS grid, max content width 1200px, gutter 24px on desktop / 16px on mobile, outer page padding `clamp(1rem, 4vw, 2.5rem)`.

**Breakpoints.** `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`, `2xl 1440px`. We test all four playbook widths (320 / 768 / 1024 / 1440).

**Layout patterns by section.**

- **Hero.** Two-column on `lg+`: left = headline + subhead + dual CTA, right = `CodeSample` tabbed component (request / response). Single column < 1024px with the code sample collapsing to a horizontally scrollable card.
- **Coverage matrix.** Three-column card grid on `lg+`, two-column on `md`, single column < 768px.
- **Pricing.** Three pricing cards side-by-side on `lg+`, vertical stack < 1024px. The middle (recommended) tier is highlighted with an amber 1px ring and a "Most teams start here" eyebrow.
- **API docs.** Two-column with sticky table-of-contents (left) on `xl+`, single column otherwise.

No horizontal scroll at 320px. The code-sample card is the only element allowed to scroll horizontally on mobile, and only inside its own bounded box with a fade-out gradient on the right edge.

---

## 8. Component catalog

ShadCN-imported and project-owned components in `apps/landing/components/`:

- `Header` — sticky, 64px tall, contains logo + 4 anchor links + "Read the docs" + "Get API key" (signal CTA). Backdrop blurs on scroll.
- `Hero` — composes `CodeSample`, two CTAs (`Get API key`, `Read the docs`), and the proof row (P50, coverage %, freshness).
- `CodeSample` — tabbed code panel with `Request`, `Response`, `cURL`, `Node` tabs. Mono font, monochrome syntax, copy-to-clipboard button.
- `CoverageMatrix` — 6-cell card grid: Decision-makers, Firmographics, Technographics, Intent signals, Contact triangulation, Source-linked confidence. Each cell shows an eyebrow, a one-line description, and a coverage percentage.
- `LatencyMeter` — three-up stat strip: P50 latency, coverage of NA + EMEA, refresh window. Numerals in JetBrains Mono 600.
- `PricingCard` — credit-pack card. Top: pack name (eyebrow). Middle: total credits in display type, USD price, per-credit breakdown. Bottom: NOWPayments CTA (`Pay with crypto`) and a secondary `Talk to sales` link for enterprise.
- `ApiSnippet` — full-width docs section with three tabbed sections: Authentication, Single enrichment, Webhook callback.
- `FaqAccordion` — eight-question accordion. ShadCN `accordion` primitive.
- `Footer` — three-column footer: Product, Resources, Legal. The line "Built for engineers who measure their week in P95 and freshness." sits above the legal row.

---

## 9. Landing page structure

Section order, top to bottom, on the marketing landing at `lead-enrichment.prin7r.com`:

1. **Header** (sticky)
2. **Hero** — display headline, subhead, dual CTA, two-column with code sample
3. **Proof row** — three-stat strip (latency, coverage, freshness)
4. **Coverage matrix** — six cells with the schema we cover
5. **API snippet** — eyebrow "Drop-in API", tabbed code samples for auth + single + webhook
6. **Pricing** — three credit packs (Starter, Team, Scale) with NOWPayments CTAs
7. **Quality gates** — short copy block on confidence scores, source-linked fields, freshness SLAs
8. **FAQ** — eight items
9. **Footer**

Every section width-clamps to 1200px. Section vertical rhythm is `clamp(64px, 8vw, 128px)`. No carousels. No autoplaying anything.

---

## 10. Imagery and generated asset rules

**No generated photography.** The landing uses zero raster photography. All visual interest is typography and code. There is one piece of vector art:

- **Logo** — three intersecting amber lines forming a triangle, signed off in `apps/landing/components/logo.tsx`. Inline SVG only — no PNG fallback. Stroke 1.5px on a 24×24 viewbox; renders at 16, 20, 24, 32 without rasterizing.

**Diagrams.** The architecture diagram in `docs/02-architecture.md` is mermaid; the rendered version on the landing (if added in a later wave) is hand-authored SVG. No generated illustrations.

**If a future polish pass requires hero imagery**, generate via the paperclip `prin7r-generate-image` tool with the prompt template in `docs/01-brand-identity.md` (composition: instrument-panel macro, mood: precise, color: amber on slate). If the tool is unavailable due to billing, ship without imagery — do not block.

---

## 11. Motion and interaction rules

Motion is restrained and instrumental — every animation must reinforce that the surface is responding to a real action.

- Default transition: `transition-colors duration-150 ease-out`. No `ease-in-out`.
- Buttons darken the accent on hover (`--signal` → `--signal-shadow`), 150ms.
- Tabs animate the underline using a CSS transition on `transform`, not `left`, 200ms, `ease-out`.
- The code-sample copy button shows a 600ms `Copied` confirmation in mono — the only "success" microcopy on the page.
- The "Get API key" CTA on hover shows a 4px upward shift via `translateY(-1px)` and a 1px focus ring inside the button (not outside) — never a glow, never a scale, never a wobble.
- Reduced motion: every transition collapses to `0ms` under `prefers-reduced-motion: reduce`. The code-sample's "Copied" text remains, but the slide-in is instant.

No parallax. No scroll-jacking. No autoplaying carousels.

---

## 12. Accessibility and quality gates

Triangulate is **WCAG 2.1 AA** at minimum. Verified before "done":

- All interactive elements (header CTA, in-page anchors, tabs, accordion triggers, pricing CTAs, FAQ buttons) reachable via keyboard. Tab order: skip-link → header logo → nav → header CTAs → hero CTAs → tabs → coverage matrix → pricing → FAQ → footer.
- Visible focus ring: 2px solid `--signal` with 2px offset, never removed.
- Color contrast measured: `--ink` on `--surface` = 13.4:1; `--ink-muted` on `--surface` = 5.7:1; `--signal` on `--surface` = 6.9:1. All > 4.5:1 body, > 3:1 large.
- Every `<img>`/`<svg>` has meaningful `alt`/`aria-label` or explicit `aria-hidden="true"` for decorative shapes.
- The `CodeSample` tabs follow the WAI-ARIA tabs pattern (Radix `Tabs` primitive handles this for us).
- Headings descend in order — no `h2` inside an `h3` block.
- Form fields (none on the landing; future newsletter form will use `<label for>` and inline error text under the field).
- No text overlap or overflow at 320 / 768 / 1024 / 1440px (verified via Playwright in section 13).
- No copy includes Lorem ipsum or `TODO` strings.

---

## 13. Screenshots and verification artifacts

Both screenshots are captured from the **deployed** URL (`https://lead-enrichment.prin7r.com`), not localhost.

- **Desktop (1440 × 900, full page).** `docs/screenshots/landing-desktop.png`
- **Mobile (390 × 844, full page).** `docs/screenshots/landing-mobile.png`

Capture command (Playwright; chromium):

```ts
const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto('https://lead-enrichment.prin7r.com', { waitUntil: 'networkidle' });
await desktop.screenshot({ path: 'docs/screenshots/landing-desktop.png', fullPage: true });
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto('https://lead-enrichment.prin7r.com', { waitUntil: 'networkidle' });
await mobile.screenshot({ path: 'docs/screenshots/landing-mobile.png', fullPage: true });
await browser.close();
```

**Health-check artifact.** `curl -sI https://lead-enrichment.prin7r.com` returns HTTP/2 200 with a Let's Encrypt certificate (`issuer=Let's Encrypt`); recorded in `wave2-reports/lead-enrichment.md`.

**API smoke artifact.** `curl -i https://lead-enrichment.prin7r.com/healthz` returns `HTTP/2 200` with a JSON body shaped `{"status":"ok","service":"triangulate-api","ts":<unix-ms>}`.

---

## 14. External references and library sources

**Direct dependencies for the landing.**

- `next@15.x` — App Router, server components, React 19
- `react@19` / `react-dom@19`
- `tailwindcss@3.4.x`
- `class-variance-authority`, `clsx`, `tailwind-merge` — ShadCN's dependency triad
- `@radix-ui/react-tabs`, `@radix-ui/react-accordion`, `@radix-ui/react-tooltip` — ShadCN primitives we use
- `lucide-react` — icon set; we limit ourselves to ≤ 6 distinct icons per page
- `next/font/google` — Fraunces, Inter, JetBrains Mono

**Direct dependencies for the API.**

- `hono@^4` — router on Bun runtime
- `zod@^3` — request body validation
- `@hono/zod-validator` — middleware adapter

**Reference reads we drew from.**

- Stripe API documentation (stripe.com/docs/api) — code-first hero, request/response split, copy primacy.
- Mercury Bank's product surface — restraint and trust through serif accents.
- Linear (linear.app) — discipline of monochromatic surfaces with a single accent.
- Refero Styles gallery (styles.refero.design) — DESIGN.md cross-reference for typography pairings.
- The ShadCN "Prin7r Component Library Baseline" Notion page (`3563ceec-2619-81c1-a147-c81bf3bd0566`).
- The Prin7r payments-prototypes README and `apps/api/checkout/[provider]/route.ts` for NOWPayments invoice flow shape.

No paid pro UI libraries are in use. No design assets are imported from sources requiring attribution beyond MIT/Apache.

---

## 15. Changelog

- **2026-05-08** — Initial release. All 15 sections authored. Landing + API scaffolded, deployed to `lead-enrichment.prin7r.com`. Desktop + mobile screenshots captured from the deployed surface. NOWPayments invoice route + IPN webhook wired to environment variables. ShadCN baseline established with `button`, `card`, `badge`, `tabs`, `accordion`, `separator`, `tooltip` imported. Brand identity codified in `docs/01-brand-identity.md`. Quality gates from section 12 verified at deploy time.
