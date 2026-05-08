import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Söhne / Cabinet Grotesk substitute. Geist is the closest free, self-hostable
// modern grotesque to Söhne; we ship weights 300 (display) and 400/500 (UI/body).
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
  display: "swap"
});

// Berkeley Mono substitute. IBM Plex Mono carries the same engineered, slab-flavoured
// feel for code samples and tabular numbers without requiring a paid licence.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap"
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
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-violet focus:px-3 focus:py-2 focus:font-mono focus:text-[11px] focus:uppercase focus:tracking-[0.08em] focus:text-platinum focus:rounded-sm"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
