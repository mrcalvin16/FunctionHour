import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!serverSecret) throw new Error("Connect server secret is missing.");
    const record = await getConvexClient().query(api.payouts.getConnectRecord, { serverSecret, clerkId: user.id });
    if (!record.accountId) return NextResponse.json({ status: "not_connected", accountId: null });
    const account = await getStripeClient().accounts.retrieve(record.accountId);
    return NextResponse.json({
      status:
        account.charges_enabled && account.payouts_enabled
          ? "active"
          : account.details_submitted
            ? "pending"
            : "incomplete",
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirementsDue: account.requirements?.currently_due?.length ?? 0,
    });
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return NextResponse.json({ error: "Unable to load payout status." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!user || !email) return NextResponse.json({ error: "A verified sign-in email is required." }, { status: 401 });
    const serverSecret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
    if (!serverSecret) throw new Error("Connect server secret is missing.");
    const { action = "onboard" } = await request.json().catch(() => ({}));
    const convex = getConvexClient();
    const stripe = getStripeClient();
    const record = await convex.query(api.payouts.getConnectRecord, { serverSecret, clerkId: user.id });
    let accountId = record.accountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email,
        business_profile: { name: user.fullName || undefined, product_description: "Event organizer ticket sales" },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { clerkUserId: user.id, platform: "Function Hour" },
      });
      accountId = account.id;
      await convex.mutation(api.payouts.saveConnectAccount, {
        serverSecret,
        clerkId: user.id,
        email,
        name: user.fullName || undefined,
        accountId,
      });
    }

    await stripe.accounts.update(accountId, {
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    if (action === "dashboard") {
      const login = await stripe.accounts.createLoginLink(accountId);
      return NextResponse.json({ url: login.url });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is missing.");
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: new URL("/host/payouts?connect=refresh", appUrl).toString(),
      return_url: new URL("/host/payouts?connect=returned", appUrl).toString(),
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error("Stripe Connect onboarding error:", error);
    return NextResponse.json({ error: "Unable to open Stripe payout setup." }, { status: 500 });
  }
}
