import { PricingTable } from "@/components/marketing/PricingTable";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { isPrelaunch } from "@/lib/stripe/config";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Unloop",
};

export default function PricingPage() {
  const prelaunch = isPrelaunch();

  return (
    <main className="min-h-screen bg-paper">
      <MarketingHeader />
      <div className="px-6 py-16 max-w-4xl mx-auto">
        <Link href="/" className="font-ui text-sm text-ink-faint hover:text-accent-selected mb-8 inline-block">
          ← Back
        </Link>
        <h1 className="font-heading text-3xl font-medium text-ink mb-2">Pricing</h1>
        <p className="font-ui text-ink-muted mb-10">7-day free trial. Cancel any time.</p>
        {prelaunch ? <WaitlistForm variant="pricing" /> : <PricingTable />}
      </div>
    </main>
  );
}
