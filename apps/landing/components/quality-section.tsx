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
    <section className="border-b border-border bg-platinum" aria-labelledby="quality-heading">
      <div className="container py-24 md:py-32">
        <div className="mb-14 max-w-2xl">
          <span className="eyebrow">Trust</span>
          <h2
            id="quality-heading"
            className="mt-4 display text-[clamp(2rem,4vw,2.75rem)] leading-[1.1] text-midnight"
          >
            Three things we ship that competitors don't.
          </h2>
        </div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="flex flex-col gap-4 border-l border-border pl-7"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-violet/10">
                  <Icon className="h-5 w-5 text-violet" aria-hidden />
                </div>
                <h3 className="text-heading-sm font-normal text-midnight leading-tight tracking-[-0.01em]">
                  {p.title}
                </h3>
                <p className="text-[14px] text-slate leading-[1.55]">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
