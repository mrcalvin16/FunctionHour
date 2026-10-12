import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

const input = z.object({
  eventId: z.string().min(1).max(100),
  venuePostalCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  percentage: z.number().finite().min(0).max(25),
  basis: z.string().trim().min(10).max(500),
  taxAddOns: z.boolean(),
  registeredAndWillRemit: z.literal(true),
});

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : requestOrigin;
  const origin = request.headers.get("origin");
  if (origin !== requestOrigin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage event taxes." }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete the organizer tax settings." }, { status: 400 });
  const { eventId, venuePostalCode, percentage, basis, taxAddOns } = parsed.data;
  try {
    const convex = getConvexClient();
    const event = await convex.query(api.events.getById, { eventId: eventId as Id<"events"> });
    if (!event || event.isDemo || (event.userId !== user.id && event.organizerId !== user.id)) {
      return NextResponse.json({ error: "Only the event owner can manage this setting." }, { status: 403 });
    }
    if (event.taxPolicy && event.taxPolicy.collector !== "organizer") {
      return NextResponse.json({ error: "Function Hour collects tax for this event." }, { status: 409 });
    }
    if (!event.venueAddress?.trim() || !event.city?.trim() || !event.state?.trim()) {
      return NextResponse.json({ error: "Complete the event venue address first." }, { status: 409 });
    }
    const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!secret) throw new Error("Tax settings are not configured.");
    const key = createHash("sha256").update(JSON.stringify({ eventId, venuePostalCode, percentage, basis, taxAddOns, userId: user.id })).digest("hex");
    const rate = await getStripeClient().taxRates.create({
      display_name: "Organizer admission tax", percentage, inclusive: false,
      country: "US", state: event.state.trim().toUpperCase(),
      description: `Event ${eventId}: organizer remits`,
      metadata: { eventId, collector: "organizer" },
    }, { idempotencyKey: `organizer-tax-${key}` });
    await convex.mutation(api.taxSettings.setOrganizerTaxPolicy, {
      serverSecret: secret, eventId: eventId as Id<"events">,
      organizerUserId: user.id, taxRateId: rate.id, ratePercentage: percentage,
      venuePostalCode, basis, taxAddOns,
    });
    return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[host.ticket-tax] Unable to save organizer tax settings", { eventId, error });
    return NextResponse.json({ error: "Could not save tax settings. Try again or contact support." }, { status: 502 });
  }
}
