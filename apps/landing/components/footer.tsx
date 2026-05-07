import Link from "next/link";
import { LogoLockup } from "@/components/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Coverage", href: "#coverage" },
      { label: "API docs", href: "#api" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" }
    ]
  },
  {
    title: "Resources",
    links: [
      { label: "Status", href: "/healthz" },
      { label: "Methodology", href: "#api" },
      { label: "Coverage benchmark", href: "#coverage" },
      { label: "Pitch deck", href: "/docs/pitch-deck.html" }
    ]
  },
  {
    title: "Contact",
    links: [
      { label: "founder@triangulate.dev", href: "mailto:founder@triangulate.dev" },
      { label: "Sales", href: "mailto:sales@triangulate.dev" },
      { label: "Privacy", href: "mailto:privacy@triangulate.dev" }
    ]
  }
];

export function Footer() {
  return (
    <footer className="surface-inverse">
      <div className="container py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4 flex flex-col gap-4">
            <span className="inline-flex">
              <LogoLockup className="text-ink-inverse" />
            </span>
            <p className="text-body" style={{ color: "var(--ink-inverse)" }}>
              Built for engineers who measure their week in P95 and freshness.
            </p>
            <p className="font-mono text-caption" style={{ color: "rgba(26,31,38,0.6)" }}>
              Triangulate is a Prin7r project · Wave 2 · 2026
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="md:col-span-2 lg:col-span-2 flex flex-col gap-3">
              <span
                className="font-mono text-eyebrow uppercase"
                style={{ color: "rgba(26,31,38,0.55)" }}
              >
                {col.title}
              </span>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-caption transition-colors hover:text-[color:var(--signal-shadow)]"
                      style={{ color: "var(--ink-inverse)" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t pt-6 md:flex-row md:items-center" style={{ borderColor: "var(--border-inverse)" }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em]" style={{ color: "rgba(26,31,38,0.55)" }}>
            © 2026 Triangulate · MIT-licensed code on github.com/prin7r-projects/lead-enrichment
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em]" style={{ color: "rgba(26,31,38,0.55)" }}>
            Verified leads, source-linked, in under 1.5 seconds.
          </p>
        </div>
      </div>
    </footer>
  );
}
