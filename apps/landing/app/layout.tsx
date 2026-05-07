import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "600"],
  display: "swap"
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lead-enrichment.prin7r.com"),
  title: "Triangulate — per-credit lead enrichment with source-linked confidence",
  description:
    "An API-first lead enrichment service. Send an email or domain; receive firmographics, decision-maker mapping, technographics, and intent signals — every field carrying a confidence score and a source URL. P50 720ms. Per-credit pricing. No contract.",
  applicationName: "Triangulate",
  authors: [{ name: "Triangulate" }],
  keywords: [
    "lead enrichment API",
    "B2B contact enrichment",
    "firmographics API",
    "technographic API",
    "intent data API",
    "Clearbit alternative",
    "Apollo alternative",
    "ZoomInfo alternative"
  ],
  openGraph: {
    title: "Triangulate — verified leads, source-linked",
    description:
      "Per-credit lead enrichment with source-linked confidence. P50 720ms. From $0.025/credit.",
    url: "https://lead-enrichment.prin7r.com",
    siteName: "Triangulate",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Triangulate — verified leads, source-linked",
    description:
      "Per-credit lead enrichment with source-linked confidence. P50 720ms. From $0.025/credit."
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${fraunces.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-signal focus:px-3 focus:py-2 focus:font-mono focus:text-[11px] focus:uppercase focus:tracking-[0.08em] focus:text-[color:var(--surface)] focus:rounded-md"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
