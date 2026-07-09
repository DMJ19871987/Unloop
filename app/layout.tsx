import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Spectral, Hanken_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/app/ServiceWorkerRegister";
import "./globals.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Unloop — Empty your head",
  description:
    "A visual decompression tool for mental offload. Turn racing thoughts and mental load into calm open loops you can close, contain, or set down.",
  openGraph: {
    title: "Unloop — Empty your head",
    description:
      "Speak freely. Unloop turns the swirl into a calm field of open loops.",
    type: "website",
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
      <body className={`${spectral.variable} ${hanken.variable} antialiased`}>
        <ThemeProvider>
          <ServiceWorkerRegister />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );

  if (!clerkKey) {
    return content;
  }

  return <ClerkProvider publishableKey={clerkKey}>{content}</ClerkProvider>;
}
