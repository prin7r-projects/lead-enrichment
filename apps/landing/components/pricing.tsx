"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PACKS } from "@/lib/pricing";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-border" aria-labelledby="pricing-heading">
      <div className="container py-20 md:py-24">
        <div className="mb-12 max-w-2xl">
          <span className="eyebrow">Pricing</span>
          <h2 id="pricing-heading" className="mt-3 text-h2 text-ink">
            One credit, one verified record.
          </h2>
          <p className="mt-4 text-lead text-ink-muted">
            Three credit packs. No contract, no seats. Cached responses don't consume credits.
            Refund prorated to unused credits within 30 days, refunded to the same payment rail.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          {PACKS.map((pack) => (
            <PricingCard key={pack.id} pack={pack} highlighted={pack.id === "team"} />
          ))}
        </div>

        <p className="mt-10 text-caption text-ink-muted text-center">
          Above 100k credits/month?{" "}
          <a
            href="mailto:founder@triangulate.dev?subject=Triangulate%20enterprise%20enquiry"
            className="text-signal underline-offset-4 hover:underline"
          >
            Talk to the founder
          </a>{" "}
          for custom pricing — typically $0.01–$0.02/credit with annual prepay.
        </p>
      </div>
    </section>
  );
}

function PricingCard({
  pack,
  highlighted
}: {
  pack: (typeof PACKS)[number];
  highlighted: boolean;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/nowpayments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId: pack.id })
      });
      const data = (await res.json()) as { invoiceUrl?: string; error?: string; message?: string };
      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
        return;
      }
      if (data.error === "missing_env") {
        setError("Crypto checkout is paused while we finish onboarding. Email founder@triangulate.dev for a manual invoice.");
        return;
      }
      setError(data.message ?? "Could not create invoice. Try again in a minute.");
    } catch (e) {
      setError("Network error. Try again in a minute.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={cn(
        "flex flex-col gap-6 p-7 relative",
        highlighted && "ring-1 ring-signal/40"
      )}
    >
      {pack.ribbon ? (
        <div className="absolute -top-3 left-7">
          <Badge tone="signal">{pack.ribbon}</Badge>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <span className="eyebrow">{pack.name}</span>
        <p className="text-caption text-ink-muted">{pack.description}</p>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[2.5rem] leading-none font-semibold text-ink">
            ${pack.priceUsd.toLocaleString()}
          </span>
          <span className="font-mono text-caption text-ink-muted">USD · one-time</span>
        </div>
        <p className="mt-2 font-mono text-caption text-ink-muted">
          {pack.credits.toLocaleString()} credits · {pack.perCredit} / credit
        </p>
      </div>

      <ul className="flex flex-col gap-2.5 text-caption text-ink">
        {pack.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-[2px] h-4 w-4 shrink-0 text-signal" aria-hidden />
            <span className="text-ink-muted">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2">
        <Button
          variant={highlighted ? "primary" : "secondary"}
          size="lg"
          onClick={startCheckout}
          disabled={loading}
          aria-label={`Pay ${pack.priceUsd} dollars with crypto for ${pack.name} pack`}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Creating invoice…
            </>
          ) : (
            "Pay with crypto"
          )}
        </Button>
        {error ? (
          <p role="alert" className="text-caption text-warn leading-snug">
            {error}
          </p>
        ) : (
          <p className="text-[11px] text-ink-muted leading-snug">
            USDT-TRC20, USDC-Polygon, USDC-ERC20 via NOWPayments hosted invoice.
          </p>
        )}
      </div>
    </Card>
  );
}
