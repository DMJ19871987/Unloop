import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
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
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/field"
      />
    </main>
  );
}
