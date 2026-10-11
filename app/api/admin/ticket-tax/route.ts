import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

const input = z.object({
  eventId: z.string().min(1),
  venuePostalCode: z.string().regex(/^\d{5}(?:-\d{4})?$/),
  mode: z.enum(["collect", "exempt"]),
  taxRateId: z.string().regex(/^txr_[A-Za-z0-9]+$/).optional(),
  serviceFeeTaxRateId: z.string().regex(/^txr_[A-Za-z0-9]+$/).optional(),
  addOnTaxRateId: z.string().regex(/^txr_[A-Za-z0-9]+$/).optional(),
  reason: z.string().trim().min(10).max(500),
});

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : requestOrigin;
  const origin = request.headers.get("origin");
  if (origin !== requestOrigin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!(await hasFunctionHourAdminAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Complete the tax review fields." }, { status: 400 });
  const { eventId, mode, taxRateId, serviceFeeTaxRateId, addOnTaxRateId, venuePostalCode, reason } = parsed.data;
  if ((mode === "collect" && !taxRateId) || (mode === "exempt" && (taxRateId || serviceFeeTaxRateId || addOnTaxRateId))) {
    return NextResponse.json({ error: "Select a rate for collection or no rates for an exemption." }, { status: 400 });
  }
  try {
    const convex = getConvexClient();
    const event = await convex.query(api.events.getById, { eventId: eventId as Id<"events"> });
    if (!event || event.isDemo || !event.venueAddress || !event.city || !event.state) {
      return NextResponse.json({ error: "Complete the event venue before tax review." }, { status: 409 });
    }
    let ratePercentage: number | undefined;
    for (const rateId of [taxRateId, serviceFeeTaxRateId, addOnTaxRateId].filter((id): id is string => Boolean(id))) {
      const rate = await getStripeClient().taxRates.retrieve(rateId);
      if (!rate.active || rate.inclusive || !Number.isFinite(rate.percentage) ||
          (rate.country && rate.country !== "US") ||
          (rate.state && rate.state.toUpperCase() !== event.state.trim().toUpperCase())) {
        return NextResponse.json({ error: "Stripe tax rate must be active, exclusive, and match the venue state." }, { status: 409 });
      }
      if (rateId === taxRateId) ratePercentage = rate.percentage;
    }
    const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!secret) throw new Error("Ticket tax review is not configured.");
    await convex.mutation(api.taxSettings.setEventTaxPolicy, {
      serverSecret: secret, eventId: eventId as Id<"events">,
      mode, taxRateId, serviceFeeTaxRateId, addOnTaxRateId, ratePercentage, venuePostalCode, reason,
      reviewedBy: (await auth()).userId!,
    });
    console.info("[admin.ticket-tax] Event tax review saved", { eventId, mode, taxRateId, serviceFeeTaxRateId, addOnTaxRateId });
    return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin.ticket-tax] Review failed", { eventId, error });
    return NextResponse.json({ error: "Unable to save the tax review. Verify the event and Stripe rates." }, { status: 502 });
  }
}
