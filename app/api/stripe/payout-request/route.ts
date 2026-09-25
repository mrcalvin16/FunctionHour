import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

async function loadOrganizer(userId: string) {
  const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!secret) throw new Error("Payout service is not configured.");
  const convex = getConvexClient();
  const [connect, summary] = await Promise.all([
    convex.query(api.payouts.getConnectRecord, { serverSecret: secret, clerkId: userId }),
    convex.query(api.payouts.getOrganizerPayoutSummary, { serverSecret: secret, clerkId: userId }),
  ]);
  const account = connect.accountId
    ? await getStripeClient().accounts.retrieve(connect.accountId)
    : null;
  const balance = await getStripeClient().balance.retrieve();
  const available = balance.available.find((item) => item.currency === "usd")?.amount ?? 0;
  const accountReady = Boolean(
    account?.payouts_enabled &&
    account.capabilities?.transfers === "active",
  );
  return {
    secret,
    convex,
    account,
    summary,
    availableStripeBalance: available / 100,
    accountReady,
    requestableAmount: Math.max(
      0,
      Math.min(summary.requestableAmount, available / 100),
    ),
  };
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const data = await loadOrganizer(user.id);
    return NextResponse.json({
      connected: Boolean(data.account),
      accountReady: data.accountReady,
      accountId: data.account?.id ?? null,
      earnedAmount: data.summary.earnedAmount,
      transferredAmount: data.summary.transferredAmount,
      requestedAmount: data.summary.requestedAmount,
      availableStripeBalance: data.availableStripeBalance,
      requestableAmount: data.requestableAmount,
      pendingRequest: data.summary.pendingRequest,
    });
  } catch (error) {
    console.error("Organizer payout summary error:", error);
    return NextResponse.json({ error: "Unable to load payout request status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : new URL(request.url).origin;
    const requestOrigin = new URL(request.url).origin;
    const origin = request.headers.get("origin");
    if (origin !== requestOrigin && origin !== appOrigin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const data = await loadOrganizer(user.id);
    if (!data.account || !data.accountReady) {
      return NextResponse.json(
        { error: "Complete Stripe payout setup before requesting funds. Ticket purchases are still available." },
        { status: 409 },
      );
    }
    if (data.requestableAmount <= 0 && !data.summary.pendingRequest) {
      return NextResponse.json(
        { error: "There are no eligible funds currently available to transfer." },
        { status: 409 },
      );
    }

    const request = await data.convex.mutation(
      api.payouts.createOrganizerPayoutRequest,
      {
        serverSecret: data.secret,
        clerkId: user.id,
        stripeAccountId: data.account.id,
        requestedAmount: Math.floor(Math.min(
          data.summary.requestableAmount,
          data.availableStripeBalance,
        ) * 100) / 100,
      },
    );
    const availableCents = data.availableStripeBalance * 100;
    if (request.amount * 100 > availableCents) {
      return NextResponse.json(
        { error: "Stripe funds are still pending. Try again when they are available." },
        { status: 409 },
      );
    }

    const transfer = await getStripeClient().transfers.create(
      {
        amount: Math.round(request.amount * 100),
        currency: "usd",
        destination: data.account.id,
        transfer_group: `functionhour-organizer-${user.id}`,
        metadata: {
          type: "organizer_payout_request",
          organizerId: user.id,
          payoutRequestId: String(request.requestId),
        },
      },
      { idempotencyKey: `functionhour-payout-${request.requestId}` },
    );

    await data.convex.mutation(api.payouts.markOrganizerPayoutTransferred, {
      serverSecret: data.secret,
      requestId: request.requestId,
      stripeTransferId: transfer.id,
    });
    return NextResponse.json({
      success: true,
      amount: request.amount,
      transferId: transfer.id,
      message: "Funds were transferred to your Stripe account. Your bank payout follows the schedule shown in Stripe.",
    });
  } catch (error) {
    console.error("Organizer payout request error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("no eligible ticket funds")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Unable to transfer funds right now. Your request can be retried safely." },
      { status: 502 },
    );
  }
}
