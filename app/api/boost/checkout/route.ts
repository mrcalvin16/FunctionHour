import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";

export async function POST(req: Request) {
  try {
    if (process.env.BOOST_PAYMENTS_ENABLED !== "true")
      return NextResponse.json({ error: "Boost checkout is temporarily unavailable." }, { status: 503 });
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!secret) throw new Error("Missing server webhook secret");
    const body = await req.json();
    const quoteId = typeof body.quoteId === "string" ? body.quoteId : "";
    if (!quoteId || quoteId.length > 120) return NextResponse.json({ error: "Select a current boost quote." }, { status: 400 });
    const convex = getConvexClient();
    const quote = await convex.query(api.boostQuotes.getQuoteForCheckout, {
      serverSecret: secret, quoteId: quoteId as Id<"boostQuotes">, clerkId: user.id,
    });
    if (!quote) return NextResponse.json({ error: "Quote expired or unavailable. Request a new price." }, { status: 409 });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || !appUrl.startsWith("https://")) throw new Error("Missing HTTPS application URL");
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: quote.totalCents,
          product_data: { name: `FunctionHour ${quote.placement} boost`,
            description: `${quote.durationDays}-day event promotion` },
        },
      }],
      metadata: { checkoutType: "dynamic_boost", quoteId, eventId: String(quote.eventId), organizerId: user.id },
      payment_intent_data: { metadata: { checkoutType: "dynamic_boost", quoteId } },
      success_url: `${appUrl}/host/boost?eventId=${quote.eventId}&boost=success`,
      cancel_url: `${appUrl}/host/boost?eventId=${quote.eventId}&boost=cancelled`,
    }, { idempotencyKey: `dynamic-boost-${quoteId}` });
    await convex.mutation(api.boostQuotes.attachCheckoutSession, {
      serverSecret: secret, quoteId: quoteId as Id<"boostQuotes">,
      clerkId: user.id, stripeCheckoutSessionId: session.id,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[boost.checkout] failed", error);
    return NextResponse.json({ error: "Unable to start boost checkout." }, { status: 500 });
  }
}
