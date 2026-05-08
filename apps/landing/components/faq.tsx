import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ITEMS = [
  {
    q: "What is your refund policy?",
    a: "Prorated to unused credits within 30 days of purchase, refunded to the same payment rail (USDT or USDC). Email founder@triangulate.dev with the order id; expect a reply within one business day."
  },
  {
    q: "Why crypto-only payment?",
    a: "Honest answer: our merchant-processor stack is in early-stage setup. Stablecoin invoicing via NOWPayments lets us ship a paid product today. Card support comes in Wave 3 via NOWPayments' fiat-on-ramp partner. For named B2B customers above $5k, we already accept USDT-TRC20 invoicing on Net-30 terms."
  },
  {
    q: "How is the data sourced?",
    a: "Public sources only — SEC EDGAR, Companies House, Crunchbase open snapshots, public LinkedIn, Common Crawl, MX records, BuiltWith-style header probes (no DOM scraping), news APIs, and job-board feeds. We do not buy or sell scraped private data."
  },
  {
    q: "Is this real-time?",
    a: "Real-time on a fresh enrichment (P50 720ms · P95 1.4s · cache misses). Cache hits return < 50ms and consume zero credits. Refresh windows: 28 days for firmographics, 14 days for decision-maker mapping, 24 hours for intent."
  },
  {
    q: "How do I get an API key?",
    a: "Pay for a credit pack on the pricing section. We email the API key within minutes (currently a manual hand-delivery for the first 30 customers; automated in Wave 3). Or email founder@triangulate.dev for a 50-credit free pilot — no card required."
  },
  {
    q: "What about GDPR / CCPA?",
    a: "We process only public data. Every field carries a public source URL. We support data-subject deletion requests within 7 days. Our DPA will be published in Wave 3 — for now, message founder@triangulate.dev for a copy of the draft."
  },
  {
    q: "Is this AI?",
    a: "Entity matching uses small classical models (fuzzy string matching, FastText embeddings for company-name disambiguation). We do not use generative LLMs in the enrichment pipeline because their hallucination rate is incompatible with confidence + source-linked guarantees."
  },
  {
    q: "What happens if you can't enrich a lead?",
    a: "We return `not_match` for the missing field — never a guessed value with a fabricated confidence score. The credit is still consumed for the API call, but partial-match responses (where we resolved company but not person, or vice versa) cost half a credit."
  }
];

export function Faq() {
  return (
    <section id="faq" className="border-b border-border bg-porcelain" aria-labelledby="faq-heading">
      <div className="container py-24 md:py-32">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="eyebrow">FAQ</span>
            <h2
              id="faq-heading"
              className="mt-4 display text-[clamp(2rem,4vw,2.5rem)] leading-[1.1] text-midnight"
            >
              The questions engineers ask first.
            </h2>
            <p className="mt-5 text-[15px] text-slate leading-[1.55]">
              Don't see your question?{" "}
              <a
                href="mailto:founder@triangulate.dev"
                className="text-violet underline-offset-4 hover:underline"
              >
                Email the founder
              </a>{" "}
              — replies within four business hours.
            </p>
          </div>

          <div className="lg:col-span-8">
            <Accordion type="single" collapsible className="w-full">
              {ITEMS.map((item, idx) => (
                <AccordionItem key={item.q} value={`item-${idx}`}>
                  <AccordionTrigger>{item.q}</AccordionTrigger>
                  <AccordionContent>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
