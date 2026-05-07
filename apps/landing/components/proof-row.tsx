const STATS = [
  {
    metric: "P50 latency",
    value: "720",
    unit: "ms",
    detail: "P95 1.4s · P99 2.1s · measured against 1k-record benchmark"
  },
  {
    metric: "Coverage NA / EMEA",
    value: "94 / 81",
    unit: "%",
    detail: "Per-field coverage on B2B SaaS Series A–C ICP"
  },
  {
    metric: "Refresh window",
    value: "28",
    unit: "d",
    detail: "Firmographics · 14d decision-maker · 24h intent"
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
    <section className="border-b border-border" aria-labelledby="proof-heading">
      <div className="container py-10 md:py-12">
        <h2 id="proof-heading" className="sr-only">
          Engineering proof points
        </h2>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
          {STATS.map((s) => (
            <div key={s.metric} className="flex flex-col gap-2">
              <span className="eyebrow">{s.metric}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[2rem] md:text-[2.5rem] font-semibold leading-none text-ink">
                  {s.value}
                </span>
                <span className="font-mono text-caption text-ink-muted">{s.unit}</span>
              </div>
              <p className="text-caption text-ink-muted leading-snug">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
