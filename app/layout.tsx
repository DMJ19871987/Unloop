import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fraunces, Inter } from "next/font/google";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/app/ServiceWorkerRegister";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://unloop.app"),
  title: "Unloop - Empty your head",
  description:
    "Speak or type what is circling. Unloop turns mental load into a calm field of open loops you can move, park, or release.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Unloop - Empty your head",
    description:
      "Turn mental load into a calm field of open loops you can move, park, or release.",
    type: "website",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Unloop - Empty your head",
    description: "Turn mental load into a calm field of open loops.",
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Unloop",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF7F2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const content = (
    <html lang="en-GB" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${inter.variable} antialiased`}>
        <ThemeProvider>
          <PostHogProvider>
            <ServiceWorkerRegister />
            {children}
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  if (!clerkKey) {
    return content;
  }

  return <ClerkProvider publishableKey={clerkKey}>{content}</ClerkProvider>;
}
