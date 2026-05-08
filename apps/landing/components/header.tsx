import Link from "next/link";
import { LogoLockup } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-[color:rgba(255,255,255,0.78)] backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Triangulate — home"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-violet"
        >
          <LogoLockup />
        </Link>

        <nav className="hidden items-center gap-7 text-[14px] text-slate md:flex" aria-label="Main">
          <Link
            href="#coverage"
            className="transition-colors hover:text-midnight focus-visible:text-midnight"
          >
            Coverage
          </Link>
          <Link href="#api" className="transition-colors hover:text-midnight focus-visible:text-midnight">
            API
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-midnight focus-visible:text-midnight">
            Pricing
          </Link>
          <Link href="#faq" className="transition-colors hover:text-midnight focus-visible:text-midnight">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="#api">Read the docs</Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href="#pricing">Get API key</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
