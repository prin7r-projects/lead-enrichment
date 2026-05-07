import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { ProofRow } from "@/components/proof-row";
import { CoverageMatrix } from "@/components/coverage-matrix";
import { ApiSection } from "@/components/api-section";
import { Pricing } from "@/components/pricing";
import { QualitySection } from "@/components/quality-section";
import { Faq } from "@/components/faq";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <ProofRow />
        <CoverageMatrix />
        <ApiSection />
        <Pricing />
        <QualitySection />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
