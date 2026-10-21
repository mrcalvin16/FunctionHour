import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { checkRateLimit, getClientKey } from "@/lib/supportRateLimit";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 512) return new NextResponse(null, { status: 413 });
  const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!secret) return new NextResponse(null, { status: 503 });
  try {
    const body = await request.json();
    if (typeof body?.sessionId !== "string" || !/^[a-f0-9-]{36}$/.test(body.sessionId) ||
        typeof body.path !== "string" || !/^\/[a-zA-Z0-9/_:-]*$/.test(body.path) || body.path.length > 160) {
      return new NextResponse(null, { status: 400 });
    }
    const limit = await checkRateLimit("visit", getClientKey(request), { limit: 45, windowMs: 60000 });
    if (!limit.allowed) return new NextResponse(null, { status: 429 });
    await getConvexClient().mutation(api.platformActivity.recordVisit, {
      serverSecret: secret, sessionId: body.sessionId, path: body.path,
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
