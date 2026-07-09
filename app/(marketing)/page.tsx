import {
  Hero,
  PullQuote,
  HowItWorks,
  ScienceBand,
  RecordSection,
  PrivacyBand,
  PricingSection,
  FaqSection,
  Footer,
} from "@/components/marketing/Hero";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
      <MarketingHeader />
      <Hero />
      <PullQuote />
      <HowItWorks />
      <ScienceBand />
      <RecordSection />
      <PrivacyBand />
      <PricingSection />
      <FaqSection />
      <Footer />
    </main>
  );
}
