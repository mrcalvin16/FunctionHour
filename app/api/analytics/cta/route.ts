import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { checkRateLimit, getClientKey } from "@/lib/supportRateLimit";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 1024) return new NextResponse(null, { status: 413 });
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return new NextResponse(null, { status: 400 });
    const allowed = ["create_event", "get_tickets", "ticket_checkout", "merch_checkout", "sign_in", "sign_up", "browse_events"];
    if (!allowed.includes(body.cta) || typeof body.path !== "string" || body.path.length > 160 || !body.path.startsWith("/") || /[?#]/.test(body.path)) return new NextResponse(null, { status: 400 });
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!serverSecret) return new NextResponse(null, { status: 503 });
    const limit = await checkRateLimit("cta", getClientKey(request), { limit: 30, windowMs: 60000 });
    if (!limit.allowed) return new NextResponse(null, { status: 429 });
    await getConvexClient().mutation(api.platformActivity.recordCta, { serverSecret, cta: body.cta, path: body.path });
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 503 }); }
}
