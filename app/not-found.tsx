import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-2xl text-ink mb-2">Page not found</h1>
      <p className="font-ui text-ink-muted text-sm mb-6">
        This path does not exist.
      </p>
      <Link href="/" className="font-ui text-sm text-accent-selected hover:text-accent-hover">
        Back home
      </Link>
    </main>
  );
}
