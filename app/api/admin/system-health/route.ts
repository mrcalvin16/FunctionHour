import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { getConvexClient } from "@/lib/convex";
import { getStripeClient } from "@/lib/stripe/server";
import { supportStore } from "@/lib/supportRequests";

export const dynamic = "force-dynamic";

type Check = { id: string; title: string; state: "healthy" | "attention" | "unavailable" | "unverified"; detail: string; href?: string };
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  if (!await hasFunctionHourAdminAccess()) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403, headers: noStore });
  }
  const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  const now = Date.now();
  // Each probe is independent: one broken integration must not hide other alerts.
  const [stripe, orders, payouts, support] = await Promise.allSettled([
    getStripeClient().checkout.sessions.list({ limit: 50, status: "complete" }, { timeout: 6000 }),
    secret ? getConvexClient().query(api.tickets.getPaidOrdersMissingTickets, { serverSecret: secret }) : Promise.reject(new Error("missing shared secret")),
    secret ? getConvexClient().query(api.payouts.getPendingPayoutRequests, { serverSecret: secret }) : Promise.reject(new Error("missing shared secret")),
    supportStore("/support/requests", "GET") as Promise<{ requests: Array<{
      status: string; priority?: string; followUpAt?: number; notificationStatus: string;
    }> }>,
  ]);
  const checks: Check[] = [];
  if (stripe.status === "fulfilled") {
    checks.push({ id: "stripe", title: "Stripe connection", state: "healthy", detail: `Stripe responded. Examined ${stripe.value.data.length} recent completed sessions${stripe.value.has_more ? " (more exist)" : ""}.` });
  } else {
    console.error("[admin.health] Stripe probe failed", stripe.reason);
    checks.push({ id: "stripe", title: "Stripe connection", state: "unavailable", detail: "Stripe could not be reached. Check credentials and the Stripe service." });
  }
  if (orders.status === "fulfilled") {
    checks.push({ id: "fulfillment", title: "Recorded orders without tickets", state: orders.value.length ? "attention" : "healthy", detail: `${orders.value.length} missing ticket set(s) among the latest 500 recorded orders.`, href: "/admin/orders" });
  } else {
    console.error("[admin.health] Order probe failed", orders.reason);
    checks.push({ id: "fulfillment", title: "Recorded orders without tickets", state: "unavailable", detail: "Convex fulfillment records could not be checked.", href: "/admin/orders" });
  }
  if (stripe.status === "fulfilled" && secret) {
    try {
      const paid = stripe.value.data.filter((item) => item.payment_status === "paid" && item.metadata?.checkoutType === "ticket");
      const records = await getConvexClient().query(api.tickets.getAdminOrderRecords, {
        serverSecret: secret, sessionIds: paid.map((item) => item.id),
      });
      const missing = records.filter((record) => !record.order || record.ticketCount === 0);
      checks.push({ id: "paid-sessions", title: "Paid checkouts awaiting fulfillment", state: missing.length ? "attention" : "healthy", detail: `${missing.length} incomplete among ${paid.length} paid ticket checkouts in the latest 50 completed sessions.`, href: "/admin/orders" });
    } catch (error) {
      console.error("[admin.health] Paid-session reconciliation failed", error);
      checks.push({ id: "paid-sessions", title: "Paid checkouts awaiting fulfillment", state: "unavailable", detail: "Could not compare Stripe checkouts with Convex records.", href: "/admin/orders" });
    }
  } else {
    checks.push({ id: "paid-sessions", title: "Paid checkouts awaiting fulfillment", state: "unavailable", detail: "Requires both Stripe and Convex connections.", href: "/admin/orders" });
  }
  if (payouts.status === "fulfilled") {
    const overdue = payouts.value.filter((item) => item.status === "requested" && now - item.createdAt > 24 * 60 * 60_000);
    const processing = payouts.value.filter((item) => item.status === "processing");
    checks.push({ id: "payouts", title: "Payout queue", state: overdue.length ? "attention" : "healthy", detail: `${payouts.value.length} open requests; ${overdue.length} waiting over 24 hours; ${processing.length} processing. Latest 500 only.`, href: "/admin/finance" });
  } else {
    console.error("[admin.health] Payout probe failed", payouts.reason);
    checks.push({ id: "payouts", title: "Payout queue", state: "unavailable", detail: "Could not load payout requests.", href: "/admin/finance" });
  }
  if (support.status === "fulfilled" && Array.isArray(support.value.requests)) {
    const requests = support.value.requests;
    const failed = requests.filter((item) => item.notificationStatus === "failed").length;
    const overdue = requests.filter((item) => item.status !== "resolved" && item.followUpAt && item.followUpAt < now).length;
    const urgent = requests.filter((item) => item.status !== "resolved" && item.priority === "urgent").length;
    checks.push({ id: "support", title: "Support intake & email alerts", state: failed || overdue ? "attention" : "healthy", detail: `${requests.length} recent cases; ${failed} notification failures; ${overdue} overdue follow-ups; ${urgent} open urgent cases. Email acceptance does not confirm inbox delivery.`, href: "/admin/support" });
  } else {
    if (support.status === "rejected") console.error("[admin.health] Support probe failed", support.reason);
    checks.push({ id: "support", title: "Support intake & email alerts", state: "unavailable", detail: "Could not load recent support cases.", href: "/admin/support" });
  }
  checks.push({ id: "webhooks", title: "Stripe webhook delivery", state: process.env.STRIPE_WEBHOOK_SECRET ? "unverified" : "attention", detail: process.env.STRIPE_WEBHOOK_SECRET ? "Signing secret is configured. This snapshot does not test delivery: review Stripe event destination attempts and recent ticket orders." : "Signing secret is missing. Stripe webhook deliveries cannot be verified." });
  return NextResponse.json({ checkedAt: new Date(now).toISOString(), version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "development", checks }, { headers: noStore });
}
