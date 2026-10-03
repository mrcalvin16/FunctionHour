import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";

type CartItem = { merchId?: string; variantId?: string; quantity?: number };

export async function POST(request: Request) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!user || !email) return NextResponse.json({ error: "Sign in with a verified email to buy merch." }, { status: 401 });
  const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!secret) return NextResponse.json({ error: "Merch checkout is not configured." }, { status: 500 });
  let reservationId: string | undefined;
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items as CartItem[] : [];
    if (!body.eventId || !items.length || items.length > 20) return NextResponse.json({ error: "Your cart is invalid." }, { status: 400 });
    const fulfillmentMethod = body.fulfillmentMethod === "shipping" ? "shipping" as const : "pickup" as const;
    reservationId = crypto.randomUUID();
    const convex = getConvexClient();
    const linkedEvent = await convex.query(api.events.getById, { eventId: body.eventId as Id<"events"> });
    if (linkedEvent?.isDemo) {
      return NextResponse.json({ error: "Demo Event", message: "This is a sample event created to demonstrate the FunctionHour experience. No real event or ticket purchase is associated with this listing." }, { status: 409 });
    }
    const reservation = await convex.mutation(api.merch.reserveCartForCheckout, {
      checkoutSecret: secret,
      reservationId,
      eventId: body.eventId as Id<"events">,
      userId: user.id,
      buyerEmail: email,
      buyerName: user.fullName || undefined,
      fulfillmentMethod,
      items: items.map((item) => ({ merchId: item.merchId as Id<"merch">, variantId: item.variantId as Id<"merchVariants"> | undefined, quantity: Number(item.quantity) })),
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: reservation.lineItems.map((item) => ({
        quantity: item.quantity,
        price_data: { currency: "usd", unit_amount: Math.round(item.unitPrice * 100), product_data: { name: item.variantName ? `${item.productName} — ${item.variantName}` : item.productName } },
      })),
      shipping_address_collection: fulfillmentMethod === "shipping" ? { allowed_countries: ["US", "CA"] } : undefined,
      shipping_options: fulfillmentMethod === "shipping" && reservation.shippingFee > 0 ? [{ shipping_rate_data: { type: "fixed_amount", fixed_amount: { amount: Math.round(reservation.shippingFee * 100), currency: "usd" }, display_name: "Standard shipping" } }] : undefined,
      metadata: { checkoutType: "merch", reservationId, eventId: body.eventId, fulfillmentMethod },
      expires_at: Math.floor(reservation.expiresAt / 1_000),
      success_url: new URL(`/events/${body.eventId}/merch?checkout=success`, appUrl).toString(),
      cancel_url: new URL(`/events/${body.eventId}/merch?checkout=cancelled`, appUrl).toString(),
    });
    await convex.mutation(api.merch.attachCheckoutSession, { checkoutSecret: secret, reservationId, stripeCheckoutSessionId: session.id });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (reservationId) await getConvexClient().mutation(api.merch.releaseCheckoutReservation, { checkoutSecret: secret, reservationId }).catch(() => undefined);
    console.error("Merch checkout error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start merch checkout." }, { status: 400 });
  }
}
