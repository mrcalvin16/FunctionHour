import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getStripeClient } from "@/lib/stripe/server";
import { createPrintfulOrder } from "@/lib/printful/server";
import { sendTransactionalEmail } from "@/lib/email/server";
import { ticketConfirmationEmail } from "@/lib/email/ticketConfirmation";

type TicketMetadataLine = {
  ticketTypeId?: string;
  quantity?: number;
};

function safeErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message };
  }

  return { errorName: typeof error, errorMessage: "Non-Error value thrown" };
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const requestContext = {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    deployment: process.env.VERCEL_URL ?? "unknown",
    vercelRequestId: req.headers.get("x-vercel-id") ?? "unknown",
    payloadBytes: Buffer.byteLength(body, "utf8"),
  };

  if (!signature) {
    console.error(
      "[stripe.webhook] Request rejected: missing Stripe signature",
      requestContext,
    );
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "[stripe.webhook] Request rejected: signing secret is not configured",
      {
        ...requestContext,
        signingSecretConfigured: false,
      },
    );
    return NextResponse.json(
      { error: "Webhook is not configured" },
      { status: 500 },
    );
  }

  try {
    event = getStripeClient().webhooks.constructEvent(
      body,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("[stripe.webhook] Signature verification failed", {
      ...requestContext,
      ...safeErrorDetails(error),
      stripeSignatureHeaderPresent: true,
      stripeSignatureHeaderLength: signature.length,
      signingSecretConfigured: true,
      signingSecretHasExpectedPrefix: webhookSecret.startsWith("whsec_"),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.info("[stripe.webhook] Signature verified", {
    ...requestContext,
    stripeEventId: event.id,
    stripeEventType: event.type,
    livemode: event.livemode,
  });

  if (event.type === "checkout.session.completed") {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      console.error("Missing NEXT_PUBLIC_CONVEX_URL");
      return NextResponse.json(
        { error: "Missing Convex URL" },
        { status: 500 },
      );
    }

    const convex = new ConvexHttpClient(convexUrl);
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.checkoutType === "merch") {
      const reservationId = session.metadata.reservationId;
      if (!reservationId)
        return NextResponse.json(
          { error: "Missing merch reservation metadata" },
          { status: 400 },
        );
      const shipping = session.shipping_details;
      const address = shipping?.address;
      const orderId = await convex.mutation(api.merch.completeMerchOrder, {
        webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
        reservationId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        shippingName: shipping?.name || undefined,
        shippingAddress: address
          ? [
              address.line1,
              address.line2,
              address.city,
              address.state,
              address.postal_code,
              address.country,
            ]
              .filter(Boolean)
              .join(", ")
          : undefined,
        shippingLine1: address?.line1 || undefined,
        shippingLine2: address?.line2 || undefined,
        shippingCity: address?.city || undefined,
        shippingState: address?.state || undefined,
        shippingPostalCode: address?.postal_code || undefined,
        shippingCountry: address?.country || undefined,
        shippingAmount: (session.shipping_cost?.amount_total ?? 0) / 100,
        taxAmount: (session.total_details?.amount_tax ?? 0) / 100,
        currency: session.currency || "usd",
        paidAt: session.created * 1_000,
      });
      try {
        const printfulPayload = await convex.query(
          api.merch.getPrintfulOrderPayload,
          { serverSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!, orderId },
        );
        if (printfulPayload) {
          const submitted = await createPrintfulOrder(printfulPayload);
          await convex.mutation(api.merch.recordPrintfulSubmission, {
            serverSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
            orderId,
            printfulOrderId: submitted.id,
            status: submitted.status,
          });
        }
      } catch (printfulError) {
        await convex.mutation(api.merch.recordPrintfulSubmission, {
          serverSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
          orderId,
          status: "error",
          error:
            printfulError instanceof Error
              ? printfulError.message
              : "Printful submission failed.",
        });
      }
      return NextResponse.json({ received: true });
    }

    if (session.metadata?.checkoutType === "ticket") {
      const eventId = session.metadata.eventId;
      const buyerEmail = session.metadata.buyerEmail;
      const buyerUserId = session.metadata.buyerUserId;
      const buyerName = session.metadata.buyerName || "";
      const reservationId = session.metadata.reservationId;
      const stripePaymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
      const tickets = JSON.parse(
        session.metadata.tickets || "[]",
      ) as TicketMetadataLine[];

      if (!eventId || !buyerEmail || !tickets.length) {
        return NextResponse.json(
          { error: "Missing ticket metadata" },
          { status: 400 },
        );
      }

      const ticketContext = {
        stripeEventId: event.id,
        checkoutSessionId: session.id,
        eventId,
        paymentIntentId: stripePaymentIntentId ?? "unknown",
        ticketCount: tickets.reduce(
          (total, line) => total + Math.max(0, Number(line.quantity || 0)),
          0,
        ),
      };

      try {
        await convex.mutation(api.tickets.createTicketsAfterPayment, {
          webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
          eventId: eventId as Id<"events">,
          buyerEmail,
          buyerUserId,
          buyerName,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId,
          reservationId,
          tickets: tickets.map((line) => ({
            ticketTypeId: line.ticketTypeId
              ? (line.ticketTypeId as Id<"ticketTypes">)
              : undefined,
            quantity: Number(line.quantity || 1),
          })),
        });
        console.info(
          "[stripe.webhook] Tickets created in Convex",
          ticketContext,
        );
      } catch (error) {
        console.error("[stripe.webhook] Convex ticket creation failed", {
          ...ticketContext,
          ...safeErrorDetails(error),
        });
        throw error;
      }

      try {
        await convex.mutation(api.tickets.recordTicketOrder, {
          webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
          eventId: eventId as Id<"events">,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId,
          buyerUserId,
          buyerEmail,
          buyerName,
          currency: session.currency || "usd",
          grossAmount: (session.amount_total ?? 0) / 100,
          platformFeeAmount: Number(session.metadata.platformFeeAmount || 0),
          quantity: ticketContext.ticketCount,
          paidAt: session.created * 1_000,
          discountCodeId: session.metadata.discountCodeId
            ? (session.metadata.discountCodeId as Id<"discountCodes">)
            : undefined,
          discountAmount: Number(session.metadata.discountAmount || 0),
        });
        console.info(
          "[stripe.webhook] Ticket order recorded in Convex",
          ticketContext,
        );
      } catch (error) {
        console.error("[stripe.webhook] Convex ticket order recording failed", {
          ...ticketContext,
          ...safeErrorDetails(error),
        });
        throw error;
      }

      // A delayed checkout webhook can arrive after a refund event. Reconcile
      // Stripe's current charge state so that refunded passes cannot reappear.
      let fullyRefunded = false;
      if (stripePaymentIntentId) {
        const paymentIntent = await getStripeClient().paymentIntents.retrieve(
          stripePaymentIntentId, { expand: ["latest_charge"] },
        );
        const charge = typeof paymentIntent.latest_charge === "object"
          ? paymentIntent.latest_charge : null;
        if (charge && charge.amount_refunded > 0) {
          fullyRefunded = charge.amount_refunded >= charge.amount;
          await convex.mutation(api.tickets.recordTicketRefund, {
            webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
            stripePaymentIntentId,
            refundedAmount: charge.amount_refunded / 100,
          });
        }
      }

      if (!fullyRefunded) {
        try {
        const eventName = session.metadata.eventName || "your event";
        const ticketTypeName =
          session.metadata.ticketTypeName || "Standard Admission";
        const quantity = tickets.reduce(
          (total, line) => total + Math.max(0, Number(line.quantity || 0)),
          0,
        );
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
        const ticketsUrl = new URL("/my-tickets", appUrl).toString();

        await sendTransactionalEmail({
          to: buyerEmail,
          ...ticketConfirmationEmail({
            eventName, ticketTypeName, quantity, ticketsUrl, buyerEmail,
            total: (session.amount_total ?? 0) / 100, currency: session.currency || "usd",
          }),
          idempotencyKey: `paid-ticket-${session.id}`,
        });
        } catch (emailError) {
          console.error("Paid ticket email delivery failed:", emailError);
        }
      }

      return NextResponse.json({ received: true });
    }

    const eventId = session.metadata?.eventId;
    const tier = session.metadata?.tier;
    const durationDays = Number(session.metadata?.durationDays || 0);
    const featuredWeight = Number(session.metadata?.featuredWeight || 0);

    if (!eventId || !tier || !durationDays || !featuredWeight) {
      return NextResponse.json(
        { error: "Missing boost metadata" },
        { status: 400 },
      );
    }

    await convex.mutation(api.events.activateBoostAfterPayment, {
      webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
      eventId: eventId as Id<"events">,
      tier,
      durationDays,
      featuredWeight,
      stripeCheckoutSessionId: session.id,
    });
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (
      session.metadata?.checkoutType === "merch" &&
      process.env.NEXT_PUBLIC_CONVEX_URL
    ) {
      const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      await convex.mutation(api.merch.releaseCheckoutReservation, {
        checkoutSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
        stripeCheckoutSessionId: session.id,
      });
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const stripePaymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!stripePaymentIntentId || !convexUrl) {
      return NextResponse.json({ received: true });
    }

    const convex = new ConvexHttpClient(convexUrl);
    await convex.mutation(api.tickets.recordTicketRefund, {
      webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
      stripePaymentIntentId,
      refundedAmount: charge.amount_refunded / 100,
    });
    await convex.mutation(api.merch.recordMerchRefund, {
      webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
      stripePaymentIntentId,
      refundedAmount: charge.amount_refunded / 100,
    });
  }

  if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent : dispute.payment_intent?.id;
    if (paymentIntentId && process.env.NEXT_PUBLIC_CONVEX_URL) {
      const outcome = event.type === "charge.dispute.created"
        ? "open" : dispute.status === "won" ? "won" : "lost";
      await new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL).mutation(
        api.tickets.recordTicketDispute, {
          webhookSecret: process.env.STRIPE_WEBHOOK_SHARED_SECRET!,
          stripePaymentIntentId: paymentIntentId,
          outcome,
        },
      );
      console.warn("[stripe.webhook] Payment dispute requires finance reconciliation", {
        disputeId: dispute.id, paymentIntentId, outcome,
      });
    }
  }

  return NextResponse.json({ received: true });
}
