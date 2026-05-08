import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeSample } from "@/components/code-sample";
import { ArrowRight } from "lucide-react";

const REQUEST_CURL = `$ curl -X POST https://lead-enrichment.prin7r.com/v1/enrich \\
    -H 'authorization: Bearer YOUR_KEY' \\
    -H 'content-type: application/json' \\
    -d '{"email":"jane.doe@stripe.com"}'`;

const RESPONSE_JSON = `{
  "request": {
    "input": { "email": "jane.doe@stripe.com" },
    "latencyMs": 720,
    "cached": false
  },
  "person": {
    "fullName": {
      "value": "Jane Doe",
      "confidence": 0.97,
      "sources": ["https://stripe.com/about/jane-doe"]
    },
    "title": {
      "value": "Engineering Manager, Payments",
      "confidence": 0.94,
      "sources": ["https://www.linkedin.com/in/jane-doe"]
    },
    "department": { "value": "Engineering", "confidence": 0.95 }
  },
  "company": {
    "domain": "stripe.com",
    "name": { "value": "Stripe, Inc.", "confidence": 0.99 },
    "industry": { "value": "Financial Infrastructure", "confidence": 0.96 },
    "employeeCount": { "value": 8500, "range": [7000, 10000], "confidence": 0.83 },
    "fundingStage": { "value": "Late stage / private", "lastRound": "Series I, 2026-03" }
  },
  "intent": {
    "hiring": { "openRoles": 142, "asOf": "2026-05-07" },
    "newsMentions7d": 8
  },
  "meta": {
    "freshness": { "ageDays": 3, "refreshedAt": "2026-05-05T08:00:00Z" },
    "creditsRemaining": 9873
  }
}`;

const NODE_SAMPLE = `import { Triangulate } from "@triangulate/sdk";

const tri = new Triangulate({ apiKey: process.env.TRIANGULATE_KEY });

const lead = await tri.enrich({ email: "jane.doe@stripe.com" });

console.log(lead.person.title.value);     // -> "Engineering Manager, Payments"
console.log(lead.person.title.confidence); // -> 0.94
console.log(lead.person.title.sources);    // -> ["https://www.linkedin.com/..."]`;

export function Hero() {
  return (
    <section className="relative overflow-hidden ambient-violet">
      <div className="container py-20 md:py-28 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5 flex flex-col gap-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="signal">Live · v0.1</Badge>
              <Badge tone="ok">All systems green</Badge>
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate">
                Per-credit · USDT / USDC
              </span>
            </div>

            <h1 className="display text-balance text-[clamp(2.5rem,5.5vw,3.5rem)] leading-[1.05] text-midnight">
              Verified leads,
              <br />
              source-linked,
              <br />
              <span className="text-violet">in under 1.5 seconds.</span>
            </h1>

            <p className="text-pretty text-lead text-slate max-w-[44ch]">
              Send <span className="font-mono text-midnight">{`{ "email": "jane.doe@stripe.com" }`}</span>. Get
              back her title, role history, company funding stage, technographics, hiring intent — every
              field carrying a confidence score and at least one public source URL.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="primary">
                <Link href="#pricing" className="gap-2">
                  Get an API key
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="#api">Read the docs</Link>
              </Button>
            </div>

            <p className="font-mono text-[12px] text-slate">
              First curl in under 5 minutes. No portal. No OAuth.
            </p>
          </div>

          <div className="lg:col-span-7 relative">
            {/* Subtle violet halo behind the code block — the "blueprint glow" motif */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-6 -z-10 rounded-2xl"
              style={{
                background:
                  "radial-gradient(60% 60% at 60% 30%, rgba(83,58,253,0.10), rgba(255,255,255,0) 70%)"
              }}
            />
            <CodeSample
              ariaLabel="Triangulate enrichment request and response"
              tabs={[
                { value: "request", label: "Request", language: "bash", source: REQUEST_CURL },
                { value: "response", label: "Response", language: "json", source: RESPONSE_JSON },
                { value: "node", label: "Node SDK", language: "ts", source: NODE_SAMPLE }
              ]}
              defaultTab="request"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
