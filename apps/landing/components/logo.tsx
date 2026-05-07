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
      <g stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <line x1="12" y1="3" x2="3" y2="20" />
        <line x1="12" y1="3" x2="21" y2="20" />
        <line x1="3" y1="20" x2="21" y2="20" />
        <circle cx="12" cy="3" r="1.25" fill="var(--signal)" />
        <circle cx="3" cy="20" r="1.25" fill="var(--signal)" />
        <circle cx="21" cy="20" r="1.25" fill="var(--signal)" />
      </g>
    </svg>
  );
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Logo size={22} />
      <span className="font-display text-[18px] tracking-[-0.01em] text-ink leading-none">Triangulate</span>
    </span>
  );
}
