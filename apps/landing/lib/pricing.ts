/**
 * Source of truth for credit packs. Mirrored on the landing pricing
 * section and consumed by /api/checkout/nowpayments to build the invoice.
 */

export type Pack = {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  perCredit: string;
  ribbon?: string;
  description: string;
  features: string[];
};

export const PACKS: Pack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 1_000,
    priceUsd: 49,
    perCredit: "$0.049",
    description: "Founders evaluating + small teams running ≤ 1k enrichments/month.",
    features: [
      "1,000 enrichment credits",
      "Cached responses don't burn credits",
      "Per-field confidence + sources",
      "USDT-TRC20, USDC-Polygon, USDC-ERC20",
      "Best-effort latency (P95 1.4s)",
      "Prorated refund within 30 days"
    ]
  },
  {
    id: "team",
    name: "Team",
    credits: 10_000,
    priceUsd: 399,
    perCredit: "$0.0399",
    ribbon: "Most teams start here",
    description: "RevOps engineering teams running 1k–10k enrichments/month.",
    features: [
      "10,000 enrichment credits",
      "19% discount vs. Starter",
      "Webhook-style batch callbacks",
      "All Starter features included",
      "Priority email support (24h reply)",
      "Prorated refund within 30 days"
    ]
  },
  {
    id: "scale",
    name: "Scale",
    credits: 100_000,
    priceUsd: 2_499,
    perCredit: "$0.02499",
    description: "Series-B and larger running 10k–100k enrichments/month with a contractual SLA.",
    features: [
      "100,000 enrichment credits",
      "49% discount vs. Starter",
      "Contractual ≤ 1.5s P95 SLA",
      "99.9% monthly uptime SLA",
      "Quarterly USDT-TRC20 invoicing available",
      "Named-engineer Slack support"
    ]
  }
];

export function findPack(id: string) {
  return PACKS.find((p) => p.id === id);
}
