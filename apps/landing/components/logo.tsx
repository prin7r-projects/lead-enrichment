/**
 * Triangulate logo. Three intersecting lines forming a triangle, in Deep Violet
 * on the platinum-white canvas. Inline SVG only — see DESIGN.md §10.
 */
export function Logo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <g stroke="var(--violet)" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <line x1="12" y1="3" x2="3" y2="20" />
        <line x1="12" y1="3" x2="21" y2="20" />
        <line x1="3" y1="20" x2="21" y2="20" />
        <circle cx="12" cy="3" r="1.4" fill="var(--violet)" />
        <circle cx="3" cy="20" r="1.4" fill="var(--violet)" />
        <circle cx="21" cy="20" r="1.4" fill="var(--violet)" />
      </g>
    </svg>
  );
}

export function LogoLockup({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Logo size={22} />
      <span
        className="font-display text-[18px] font-medium tracking-[-0.012em] leading-none"
        style={{ color: inverse ? "var(--platinum)" : "var(--midnight)" }}
      >
        Triangulate
      </span>
    </span>
  );
}
