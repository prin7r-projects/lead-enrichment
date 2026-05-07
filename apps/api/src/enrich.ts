/**
 * Wave 2 stub: returns a deterministic, realistic enrichment shape so
 * the contract documented on the landing is real-from-day-one. The
 * real source-layer fan-out (SEC EDGAR, Companies House, Common Crawl,
 * public LinkedIn, BuiltWith-style HTML fingerprints, MX validation)
 * lands in Wave 3 — see /docs/02-architecture.md.
 */

import { createHash } from "node:crypto";

export type EnrichInput = {
  email?: string;
  domain?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
};

export type EnrichArgs = {
  input: EnrichInput;
  correlationId: string;
  apiKey: string;
};

const sampleTitles = [
  "Engineering Manager",
  "Senior Backend Engineer",
  "Director of RevOps",
  "Head of Marketing",
  "Founder & CEO",
  "Staff Software Engineer",
  "VP of Engineering",
  "Principal Data Engineer"
];

const sampleDepartments = [
  "Engineering",
  "RevOps",
  "Marketing",
  "Sales",
  "Product",
  "Design",
  "Data",
  "Founder's office"
];

const sampleIndustries = [
  "Financial Infrastructure",
  "Developer Tools",
  "B2B SaaS",
  "Customer Data Platform",
  "Observability",
  "Reverse ETL",
  "Real-time Database",
  "AI / LLM Infrastructure"
];

const sampleTechStacks = [
  [
    { category: "CDN", vendor: "Cloudflare", confidence: 0.98 },
    { category: "Frontend framework", vendor: "React", confidence: 0.94 },
    { category: "Server runtime", vendor: "Node.js", confidence: 0.91 }
  ],
  [
    { category: "CDN", vendor: "Fastly", confidence: 0.95 },
    { category: "Frontend framework", vendor: "Next.js", confidence: 0.96 },
    { category: "Backend", vendor: "Rust", confidence: 0.86 },
    { category: "Database", vendor: "PostgreSQL", confidence: 0.92 }
  ],
  [
    { category: "Hosting", vendor: "AWS", confidence: 0.97 },
    { category: "Frontend framework", vendor: "Vue.js", confidence: 0.89 },
    { category: "Backend", vendor: "Go", confidence: 0.93 }
  ],
  [
    { category: "Hosting", vendor: "Vercel", confidence: 0.98 },
    { category: "Frontend framework", vendor: "Next.js", confidence: 0.99 },
    { category: "Database", vendor: "Neon (Postgres)", confidence: 0.94 },
    { category: "Auth", vendor: "Clerk", confidence: 0.91 }
  ]
];

export async function enrich({ input, correlationId, apiKey }: EnrichArgs) {
  // Deterministic seed from input + key so identical requests return identical responses.
  // This is what makes the contract real even before the source layer is wired up.
  const canonicalKey = canonicalize(input);
  const seed = parseInt(createHash("sha256").update(canonicalKey + apiKey).digest("hex").slice(0, 8), 16);
  const rand = mulberry32(seed);

  const domain = input.domain ?? domainFromEmail(input.email) ?? guessDomain(input.company) ?? "example.com";
  const localPart = localPartFromEmail(input.email);
  const { first, last } = nameParts({
    firstName: input.firstName,
    lastName: input.lastName,
    localPart
  });

  const fullName = first && last ? `${first} ${last}` : first || last || "Unknown contact";
  const title = pick(sampleTitles, rand);
  const department = pick(sampleDepartments, rand);
  const industry = pick(sampleIndustries, rand);
  const tech = pick(sampleTechStacks, rand);
  const employeeCount = Math.floor(50 + rand() * 9_950);
  const employeeRange = bandFromCount(employeeCount);
  const ageDays = Math.floor(rand() * 28);
  const linkedInSlug = (first + "-" + last).toLowerCase().replace(/[^a-z0-9-]/g, "");
  const refreshedAt = new Date(Date.now() - ageDays * 86_400_000).toISOString();
  const openRoles = Math.floor(20 + rand() * 200);
  const newsMentions = Math.floor(rand() * 12);

  // Simulate <1.5s P95 budget: the stub is instant so we record the shape
  // the upstream source layer will fill in. The `budgetMs` field is honest.
  const startedMs = Date.now();
  await sleep(20 + Math.floor(rand() * 60)); // 20–80ms latency

  const response = {
    request: {
      input,
      correlationId,
      ts: startedMs,
      latencyMs: Date.now() - startedMs,
      cached: false
    },
    person:
      first || last
        ? {
            fullName: {
              value: fullName,
              confidence: roundTo(0.85 + rand() * 0.14, 3),
              sources: [`https://www.linkedin.com/in/${linkedInSlug}`]
            },
            title: {
              value: title,
              confidence: roundTo(0.82 + rand() * 0.16, 3),
              sources: [`https://www.linkedin.com/in/${linkedInSlug}`]
            },
            department: {
              value: department,
              confidence: roundTo(0.88 + rand() * 0.10, 3)
            },
            location: {
              value: { city: pickCity(rand), country: "US" },
              confidence: roundTo(0.78 + rand() * 0.18, 3)
            }
          }
        : null,
    company: {
      domain,
      name: {
        value: capitalize(domain.replace(/\.[^.]+$/, "")),
        confidence: 0.99,
        sources: [`https://${domain}/about`, `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(domain)}`]
      },
      industry: {
        value: industry,
        confidence: roundTo(0.9 + rand() * 0.08, 3)
      },
      employeeCount: {
        value: employeeCount,
        range: employeeRange,
        confidence: roundTo(0.78 + rand() * 0.18, 3)
      },
      hqLocation: {
        value: { city: pickCity(rand), country: "US" },
        confidence: roundTo(0.85 + rand() * 0.13, 3)
      },
      fundingStage: {
        value: pick(["Seed", "Series A", "Series B", "Series C", "Late stage / private"], rand),
        lastRound: pickRound(rand),
        confidence: roundTo(0.85 + rand() * 0.12, 3)
      }
    },
    technographics: tech,
    intent: {
      hiring: {
        openRoles,
        byDept: {
          Engineering: Math.floor(openRoles * (0.4 + rand() * 0.2)),
          Sales: Math.floor(openRoles * (0.1 + rand() * 0.15)),
          Other: Math.floor(openRoles * (0.2 + rand() * 0.15))
        },
        asOf: refreshedAt.slice(0, 10)
      },
      newsMentions7d: newsMentions,
      changelogActivity: rand() > 0.5 ? "active" : "quiet"
    },
    contactTriangulation: input.email
      ? {
          emailDeliverability: {
            status: rand() > 0.08 ? "valid" : "risky",
            method: "smtp_echo + mx_match",
            confidence: roundTo(0.85 + rand() * 0.13, 3)
          },
          phonePatternMatch: { status: "not_attempted" }
        }
      : { emailDeliverability: { status: "not_attempted" }, phonePatternMatch: { status: "not_attempted" } },
    meta: {
      freshness: {
        ageDays,
        refreshedAt
      },
      budgetMs: 1500,
      creditsRemaining: 9_873,
      note:
        "Wave 2: deterministic-stub response. Same input + key returns the same shape. Real source-layer fan-out lands in Wave 3."
    }
  };

  return response;
}

function canonicalize(input: EnrichInput) {
  const parts = [
    input.email?.toLowerCase().trim(),
    input.domain?.toLowerCase().trim(),
    input.firstName?.toLowerCase().trim(),
    input.lastName?.toLowerCase().trim(),
    input.company?.toLowerCase().trim()
  ].filter(Boolean);
  return parts.join("|");
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

function pickCity(rand: () => number) {
  return pick(
    [
      "San Francisco",
      "New York",
      "Seattle",
      "Austin",
      "Denver",
      "Boston",
      "Chicago",
      "Los Angeles",
      "Toronto",
      "Vancouver"
    ],
    rand
  );
}

function pickRound(rand: () => number) {
  const stages = ["Seed", "Series A", "Series B", "Series C", "Series D", "Series I"];
  const stage = pick(stages, rand);
  const month = Math.floor(rand() * 12) + 1;
  return `${stage}, 2026-${String(month).padStart(2, "0")}`;
}

function bandFromCount(n: number): [number, number] {
  if (n < 100) return [50, 99];
  if (n < 250) return [100, 249];
  if (n < 500) return [250, 499];
  if (n < 1_000) return [500, 999];
  if (n < 2_500) return [1_000, 2_499];
  if (n < 5_000) return [2_500, 4_999];
  return [5_000, 10_000];
}

function nameParts(args: { firstName?: string; lastName?: string; localPart?: string }) {
  if (args.firstName || args.lastName) {
    return { first: args.firstName ?? "", last: args.lastName ?? "" };
  }
  if (args.localPart) {
    const parts = args.localPart.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return { first: capitalize(parts[0]), last: capitalize(parts[parts.length - 1]) };
    }
    if (parts.length === 1 && parts[0].length > 2) {
      return { first: capitalize(parts[0]), last: "" };
    }
  }
  return { first: "", last: "" };
}

function localPartFromEmail(email?: string) {
  if (!email) return undefined;
  const at = email.indexOf("@");
  if (at <= 0) return undefined;
  return email.slice(0, at);
}

function domainFromEmail(email?: string) {
  if (!email) return undefined;
  const at = email.indexOf("@");
  if (at < 0) return undefined;
  return email.slice(at + 1).toLowerCase();
}

function guessDomain(company?: string) {
  if (!company) return undefined;
  const slug = company
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "");
  return slug ? `${slug}.com` : undefined;
}

function capitalize(s: string) {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function roundTo(n: number, places: number) {
  const m = Math.pow(10, places);
  return Math.round(n * m) / m;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
