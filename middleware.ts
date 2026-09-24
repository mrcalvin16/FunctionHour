import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/host(.*)",
  "/admin(.*)",
  "/create-event(.*)",
  "/my-tickets(.*)",
  "/tickets(.*)",
  "/saved-events(.*)",
  "/events/(.*)/checkout(.*)",
  "/events/(.*)/add-merch(.*)",
  "/events/(.*)/edit(.*)",
  "/events/(.*)/generate-flyer(.*)",
  "/events/(.*)/tickets(.*)",
  "/api/ai(.*)",
  "/api/boost(.*)",
  "/api/stripe/ticket-checkout(.*)",
]);

// Chev is available before sign-in. These handlers validate and rate-limit
// requests themselves, while the rest of /api/ai stays behind Clerk.
const publicSupportPaths = new Set([
  "/api/ai/support",
  "/api/ai/support/handoff",
  "/api/ai/support/feedback",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request) && !publicSupportPaths.has(request.nextUrl.pathname)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);

    await auth.protect({ unauthenticatedUrl: signInUrl.toString() });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
