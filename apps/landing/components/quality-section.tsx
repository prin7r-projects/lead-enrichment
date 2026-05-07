import { ShieldCheck, Gauge, History } from "lucide-react";

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Source-linked, not score-linked",
    body: "Every confidence score ships with a public source URL. Audit any field by clicking through. No black-box scoring; no vendor pinky-swears."
  },
  {
    icon: Gauge,
    title: "Latency you can put in a contract",
    body: "P50 720ms. P95 1.4s. P99 2.1s. Methodology published. Scale tier holds us to a contractual ≤ 1.5s P95 with prorated credit refund on miss."
  },
  {
    icon: History,
    title: "Freshness on every response",
    body: "Firmographics refresh on a 28-day window; decision-maker mapping on 14d; intent on 24h. The age of any cached record is on `meta.freshness.ageDays`."
  }
];

export function QualitySection() {
  return (
    <section className="border-b border-border" aria-labelledby="quality-heading">
      <div className="container py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <span className="eyebrow">Trust</span>
          <h2 id="quality-heading" className="mt-3 text-h2 text-ink">
            Three things we ship that competitors don't.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="flex flex-col gap-4 border-l border-border pl-6">
                <Icon className="h-5 w-5 text-signal" aria-hidden />
                <h3 className="text-h3 text-ink leading-tight">{p.title}</h3>
                <p className="text-body text-ink-muted leading-relaxed">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
