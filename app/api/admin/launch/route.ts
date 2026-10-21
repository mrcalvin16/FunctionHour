import { NextResponse } from "next/server";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export async function GET(request: Request) {
  if (!(await hasFunctionHourAdminAccess())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const days = Number(new URL(request.url).searchParams.get("days") || 7);
  if (![1, 7, 30].includes(days)) return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!secret) return NextResponse.json({ error: "Launch monitoring is not configured." }, { status: 503 });
  try {
    const data = await getConvexClient().query(api.platformActivity.launchOverview, { serverSecret: secret, days });
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Monitoring data unavailable." }, { status: 503 });
  }
}
