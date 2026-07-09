import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

function noopMiddleware(_request: NextRequest) {
  return NextResponse.next();
}

function buildClerkMiddleware() {
  const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server");

  const isPublicRoute = createRouteMatcher([
    "/",
    "/pricing",
    "/privacy",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/stripe/webhook",
  "/api/waitlist",
  "/api/cron/weekly-summary",
  "/api/cron/resurface",
  "/api/cron/checkin",
  "/api/icon",
  "/dev(.*)",
]);

  return clerkMiddleware(async (auth: { protect: () => Promise<void> }, request: NextRequest) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });
}

const middleware = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? buildClerkMiddleware()
  : noopMiddleware;

export default middleware;
