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

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper">
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
