import { NextResponse } from "next/server";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";
import { transferMatchesPayout } from "@/lib/payoutReconciliation";

export const dynamic = "force-dynamic";

function secret() {
  const value = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!value) throw new Error("Payout ledger is not configured.");
  return value;
}

export async function GET(request: Request) {
  if (!(await hasFunctionHourAdminAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  try {
    const requestId = new URL(request.url).searchParams.get("requestId");
    const convex = getConvexClient();
    const serverSecret = secret();
    if (!requestId) {
      const requests = await convex.query(api.payouts.getAdminPayoutLedger, { serverSecret });
      return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!/^[a-z0-9]{20,40}$/.test(requestId)) {
      return NextResponse.json({ error: "Invalid payout request ID." }, { status: 400 });
    }
    const payout = await convex.query(api.payouts.getPayoutRequestForReview, {
      serverSecret, requestId: requestId as Id<"organizerPayoutRequests">,
    });
    const [summary, connect] = await Promise.all([
      convex.query(api.payouts.getOrganizerPayoutSummary, { serverSecret, clerkId: payout.organizerId }),
      convex.query(api.payouts.getConnectRecord, { serverSecret, clerkId: payout.organizerId }),
    ]);
    let transfer: {
      id: string; amount: number; amountReversed: number; destination: string | null;
      currency: string; matchesRequest: boolean; createdAt: number;
    } | null = null;
    let verification: "verified" | "mismatch" | "not_recorded" | "unavailable" = "not_recorded";
    if (payout.stripeTransferId) {
      try {
        const stripeTransfer = await getStripeClient().transfers.retrieve(payout.stripeTransferId);
        const matchesRequest = transferMatchesPayout(stripeTransfer, {
          requestId, stripeAccountId: payout.stripeAccountId,
          amount: payout.amount, currency: payout.currency,
        });
        transfer = {
          id: stripeTransfer.id,
          amount: stripeTransfer.amount,
          amountReversed: stripeTransfer.amount_reversed,
          destination: typeof stripeTransfer.destination === "string"
            ? stripeTransfer.destination : stripeTransfer.destination?.id ?? null,
          currency: stripeTransfer.currency,
          matchesRequest,
          createdAt: stripeTransfer.created * 1000,
        };
        verification = matchesRequest ? "verified" : "mismatch";
      } catch (error) {
        console.error("[payout.ledger] Transfer verification failed", { requestId, error });
        verification = "unavailable";
      }
    }
    if (payout.status === "transferred" && !payout.stripeTransferId) verification = "mismatch";
    return NextResponse.json({
      payout: {
        requestId: payout._id, organizerId: payout.organizerId,
        stripeAccountId: payout.stripeAccountId,
        stripeTransferId: payout.stripeTransferId ?? null,
        amount: payout.amount, currency: payout.currency, status: payout.status,
        reviewedBy: payout.reviewedBy ?? null, reviewNote: payout.reviewNote ?? null,
        createdAt: payout.createdAt, updatedAt: payout.updatedAt,
      },
      summary, currentAccountId: connect.accountId, transfer, verification,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[payout.ledger] Read failed", error);
    return NextResponse.json({ error: "Unable to load payout ledger. Check Convex and Stripe." }, { status: 502 });
  }
}
