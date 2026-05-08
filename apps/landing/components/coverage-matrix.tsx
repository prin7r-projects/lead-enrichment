import { Building2, IdCard, Layers, Radar, Network, Fingerprint } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Coverage matrix — refined Stripe-style bento grid. Six porcelain cards on a
 * platinum canvas. Hairline borders, soft hover elevation, eyebrow + title +
 * body + status pills (no garish badges).
 */
const CELLS = [
  {
    eyebrow: "01 · Firmographics",
    icon: Building2,
    title: "Company shape",
    body: "Industry, employee band, HQ, funding stage and last round — sourced from SEC, Companies House, and Crunchbase open snapshots.",
    coverage: "94% NA · 81% EMEA",
    freshness: "28d"
  },
  {
    eyebrow: "02 · Decision-maker map",
    icon: IdCard,
    title: "Person profile",
    body: "Full name, current title, department, two most recent role changes — each with the LinkedIn URL we used to derive it.",
    coverage: "92% NA · 76% EMEA",
    freshness: "14d"
  },
  {
    eyebrow: "03 · Technographics",
    icon: Layers,
    title: "Stack fingerprint",
    body: "CDN, framework, runtime, database, auth provider — derived from header probes and DOM-free HTML response fingerprinting.",
    coverage: "93% all regions",
    freshness: "7d"
  },
  {
    eyebrow: "04 · Intent",
    icon: Radar,
    title: "Hiring + news + changelog",
    body: "Open-role count by department, news mention count over 7d, changelog activity (active vs. quiet) — refreshed daily.",
    coverage: "97% NA · 88% EMEA",
    freshness: "24h"
  },
  {
    eyebrow: "05 · Contact triangulation",
    icon: Network,
    title: "Email deliverability",
    body: "SMTP echo + MX validation + breach-disclosure metadata. We return `not_match` instead of guessing pattern-built emails.",
    coverage: "92% verified rate",
    freshness: "real-time"
  },
  {
    eyebrow: "06 · Provenance",
    icon: Fingerprint,
    title: "Source-linked confidence",
    body: "Every field ships with a 0.0–1.0 confidence score and at least one public source URL. Click the URL, audit the claim.",
    coverage: "100%",
    freshness: "always"
  }
];

export function CoverageMatrix() {
  return (
    <section id="coverage" className="border-b border-border bg-platinum" aria-labelledby="coverage-heading">
      <div className="container py-24 md:py-32">
        <div className="mb-14 max-w-2xl">
          <span className="eyebrow">What we return</span>
          <h2
            id="coverage-heading"
            className="mt-4 display text-[clamp(2rem,4vw,2.75rem)] leading-[1.1] text-midnight"
          >
            Six categories. One JSON. Six confidence scores.
          </h2>
          <p className="mt-5 text-lead text-slate max-w-[55ch] leading-[1.5]">
            The schema is the hero. Every field on the response carries a confidence score and the
            public source we used to derive it.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CELLS.map((cell) => {
            const Icon = cell.icon;
            return (
              <Card key={cell.title} className="flex flex-col gap-4 p-7">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">{cell.eyebrow}</span>
                  <Icon className="h-4 w-4 text-violet" aria-hidden />
                </div>
                <h3 className="text-heading-sm font-normal text-midnight tracking-[-0.01em]">
                  {cell.title}
                </h3>
                <p className="text-[14px] text-slate leading-[1.55]">{cell.body}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  <Badge tone="signal">{cell.coverage}</Badge>
                  <Badge tone="neutral">refresh · {cell.freshness}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
