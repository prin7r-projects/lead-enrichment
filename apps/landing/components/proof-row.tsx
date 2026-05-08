/**
 * Proof row — four-stat strip on a porcelain-banded section. Tabular figures
 * in mono so the numbers align across breakpoints.
 */
const STATS = [
  {
    metric: "P50 latency",
    value: "720",
    unit: "ms",
    detail: "P95 1.4s · P99 2.1s · 1k-record benchmark"
  },
  {
    metric: "Coverage NA / EMEA",
    value: "94 / 81",
    unit: "%",
    detail: "Per-field on B2B SaaS Series A–C ICP"
  },
  {
    metric: "Refresh window",
    value: "28",
    unit: "d",
    detail: "Firmographics · 14d people · 24h intent"
  },
  {
    metric: "Per-credit price",
    value: "$0.025",
    unit: "min",
    detail: "Scale tier · 49% off Starter"
  }
];

export function ProofRow() {
  return (
    <section className="border-y border-border bg-porcelain" aria-labelledby="proof-heading">
      <div className="container py-12 md:py-14">
        <h2 id="proof-heading" className="sr-only">
          Engineering proof points
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 md:grid-cols-4 md:gap-8">
          {STATS.map((s) => (
            <div key={s.metric} className="flex flex-col gap-2">
              <span className="eyebrow">{s.metric}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[clamp(2rem,3.4vw,2.75rem)] font-light leading-none text-midnight tracking-[-0.025em]">
                  {s.value}
                </span>
                <span className="font-mono text-caption text-slate">{s.unit}</span>
              </div>
              <p className="text-[13px] text-slate leading-snug max-w-[28ch]">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
