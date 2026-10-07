import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";
function secret() {
  const value = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!value) throw new Error("Operations service is not configured.");
  return value;
}
export async function GET() {
  if (!(await hasFunctionHourAdminAccess())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  try { return NextResponse.json({ holds: await getConvexClient().query(api.payouts.listEventChangeHolds, { serverSecret: secret() }) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("[event-change-holds] List failed", error); return NextResponse.json({ error: "Unable to load holds." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!(await hasFunctionHourAdminAccess())) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const { userId } = await auth();
  const input = await request.json().catch(() => null);
  if (typeof input?.eventId !== "string" || typeof input?.reviewNote !== "string") return NextResponse.json({ error: "Event and review note required." }, { status: 400 });
  try {
    await getConvexClient().mutation(api.payouts.clearEventChangeHold, { serverSecret: secret(), eventId: input.eventId as Id<"events">, reviewedBy: userId!, reviewNote: input.reviewNote });
    return NextResponse.json({ success: true });
  } catch (error) { console.error("[event-change-holds] Review failed", error); return NextResponse.json({ error: "Could not clear hold. Confirm refund reconciliation and retry." }, { status: 409 }); }
}
