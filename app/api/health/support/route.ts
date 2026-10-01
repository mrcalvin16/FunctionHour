import { NextResponse } from "next/server";
import { supportSiteUrl } from "@/lib/supportRequests";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL?.trim());
  const hasStoreSecret = Boolean(process.env.STRIPE_WEBHOOK_SHARED_SECRET?.trim());
  const hasEmailKey = Boolean(process.env.RESEND_API_KEY?.trim());
  let intakeDeployed = false;
  if (hasConvexUrl && hasStoreSecret) {
    try {
      // The unauthenticated route must reject us. A 404 means Convex HTTP
      // actions have not been deployed, even when all env vars are set.
      const response = await fetch(new URL("/support/requests", supportSiteUrl()), {
        cache: "no-store", signal: AbortSignal.timeout(4000),
      });
      intakeDeployed = response.status === 403;
    } catch (error) {
      console.error("[support.health] Convex intake probe failed", error);
    }
  }
  const configured = hasConvexUrl && hasStoreSecret && hasEmailKey && intakeDeployed;

  return NextResponse.json(
    {
      status: configured ? "ok" : "degraded",
      service: "functionhour-support-intake",
      checks: {
        convexConfigured: hasConvexUrl,
        supportStorageConfigured: hasStoreSecret,
        emailConfigured: hasEmailKey,
        intakeDeployed,
      },
      version:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "development",
      timestamp: new Date().toISOString(),
    },
    {
      status: configured ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
