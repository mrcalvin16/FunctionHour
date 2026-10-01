import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasConvexUrl = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL?.trim());
  const hasStoreSecret = Boolean(process.env.STRIPE_WEBHOOK_SHARED_SECRET?.trim());
  const hasEmailKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const configured = hasConvexUrl && hasStoreSecret && hasEmailKey;

  return NextResponse.json(
    {
      status: configured ? "ok" : "degraded",
      service: "functionhour-support-intake",
      checks: {
        convexConfigured: hasConvexUrl,
        supportStorageConfigured: hasStoreSecret,
        emailConfigured: hasEmailKey,
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
