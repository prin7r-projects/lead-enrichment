/**
 * Dashboard layout — auth via ?token= API key query param.
 *
 * Minimal credential card nav: Credits, API Keys, Billing.
 * Token is read from URL searchParams and passed to the page.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Triangulate — Dashboard",
  robots: { index: false, follow: false }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--porcelain)]">
      {children}
    </div>
  );
}
