import { SignUp } from "@clerk/nextjs";
import { parsePublicPlan, subscribeUrl } from "@/lib/stripe/plans";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan = parsePublicPlan(params.plan) ?? "annual";

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center p-6">
        <p className="font-ui text-ink-muted text-center">
          Authentication is not configured. Add Clerk keys to .env.local.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center p-6">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl={subscribeUrl(plan)}
      />
    </main>
  );
}
