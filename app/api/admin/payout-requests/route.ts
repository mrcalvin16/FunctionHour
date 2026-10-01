import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { payoutApprovalBlockReason } from "@/lib/payoutApproval";
import { transferMatchesPayout } from "@/lib/payoutReconciliation";

export const dynamic = "force-dynamic";

function secret() {
  const value = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!value) throw new Error("Payout service is not configured.");
  return value;
}

export async function GET() {
  if (!(await hasFunctionHourAdminAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  try {
    const [requests, missingTickets] = await Promise.all([
      getConvexClient().query(api.payouts.getPendingPayoutRequests, { serverSecret: secret() }),
      getConvexClient().query(api.tickets.getPaidOrdersMissingTickets, { serverSecret: secret() }),
    ]);
    return NextResponse.json({ requests, missingTickets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[payout.review] List failed", error);
    return NextResponse.json({ error: "Unable to load requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : new URL(request.url).origin;
  if (origin !== new URL(request.url).origin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (!(await hasFunctionHourAdminAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { userId } = await auth();
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== "object") throw new Error("Invalid request.");
    const { requestId, action, transferId } = input as { requestId?: unknown; action?: unknown; transferId?: unknown };
    if (typeof requestId !== "string" || !requestId ||
        (action !== "approve" && action !== "reject" && action !== "reconcile")) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    const convex = getConvexClient();
    const serverSecret = secret();
    const id = requestId as Id<"organizerPayoutRequests">;
    const payout = await convex.query(api.payouts.getPayoutRequestForReview, {
      serverSecret, requestId: id,
    });
    if (action === "reconcile") {
      if (payout.status !== "processing" || typeof transferId !== "string" || !/^tr_[a-zA-Z0-9]+$/.test(transferId)) {
        return NextResponse.json({ error: "A processing request and valid Stripe transfer ID are required." }, { status: 400 });
      }
      const transfer = await getStripeClient().transfers.retrieve(transferId);
      if (!transferMatchesPayout(transfer, {
        requestId: String(id), stripeAccountId: payout.stripeAccountId,
        amount: payout.amount, currency: payout.currency,
      })) {
        return NextResponse.json({ error: "Transfer does not match this request." }, { status: 409 });
      }
      await convex.mutation(api.payouts.markOrganizerPayoutTransferred, {
        serverSecret, requestId: id, stripeTransferId: transfer.id, reviewedBy: userId!,
      });
      console.info("[payout.review] Reconciled", { requestId: id, transferId: transfer.id, reviewer: userId });
      return NextResponse.json({ success: true, transferId: transfer.id });
    }
    if (payout.status !== "requested") {
      return NextResponse.json({ error: "This request is processing or no longer pending. Reconcile it in Stripe before another action." }, { status: 409 });
    }

    if (action === "reject") {
      await convex.mutation(api.payouts.rejectOrganizerPayoutRequest, {
        serverSecret, requestId: id, reviewedBy: userId!,
        reviewNote: "Operations review: request declined; organizer may submit another request.",
      });
      console.info("[payout.review] Rejected", { requestId: id, reviewer: userId });
      return NextResponse.json({ success: true });
    }

    const [summary, connect, balance] = await Promise.all([
      convex.query(api.payouts.getOrganizerPayoutSummary, {
        serverSecret, clerkId: payout.organizerId,
      }),
      convex.query(api.payouts.getConnectRecord, {
        serverSecret, clerkId: payout.organizerId,
      }),
      getStripeClient().balance.retrieve(),
    ]);
    const account = connect.accountId === payout.stripeAccountId
      ? await getStripeClient().accounts.retrieve(payout.stripeAccountId)
      : null;
    const cents = Math.round(payout.amount * 100);
    const available = balance.available.find((item) => item.currency === "usd")?.amount ?? 0;
    const blockReason = payoutApprovalBlockReason({
      requestedCents: cents,
      availableCents: available,
      remainingLedgerCents: Math.round((summary.earnedAmount - summary.requestedAmount + payout.amount) * 100),
      pendingCents: summary.pendingRequest ? Math.round(summary.pendingRequest.amount * 100) : null,
      accountReady: Boolean(account?.payouts_enabled && account.capabilities?.transfers === "active"),
      openDisputes: summary.openDisputeCount,
    });
    if (blockReason) {
      return NextResponse.json({ error: `${blockReason} Reconcile before approving.` }, { status: 409 });
    }

    // A stable idempotency key makes an interrupted approval safe to retry.
    await convex.mutation(api.payouts.beginOrganizerPayoutTransfer, {
      serverSecret, requestId: id, reviewedBy: userId!,
    });
    const transfer = await getStripeClient().transfers.create({
      amount: cents,
      currency: "usd",
      destination: payout.stripeAccountId,
      transfer_group: `functionhour-organizer-${payout.organizerId}`,
      metadata: {
        type: "organizer_payout_request",
        organizerId: payout.organizerId,
        payoutRequestId: String(id),
      },
    }, { idempotencyKey: `functionhour-payout-${id}` });

    console.info("[payout.review] Stripe transfer created; recording in Convex", {
      requestId: id, transferId: transfer.id, reviewer: userId,
    });

    await convex.mutation(api.payouts.markOrganizerPayoutTransferred, {
      serverSecret, requestId: id, stripeTransferId: transfer.id, reviewedBy: userId!,
    });
    console.info("[payout.review] Transferred", { requestId: id, transferId: transfer.id, reviewer: userId });
    return NextResponse.json({ success: true, transferId: transfer.id });
  } catch (error) {
    console.error("[payout.review] Action failed", error);
    return NextResponse.json({ error: "Unable to complete payout review. Inspect Stripe and the request before retrying." }, { status: 502 });
  }
}
