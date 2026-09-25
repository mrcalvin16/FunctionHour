import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getStripeClient } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

function getAllowedAdminIds() {
  return new Set(
    (process.env.SUPPORT_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function money(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default async function FinanceAdminPage() {
  const session = await auth();
  if (!session.userId || !getAllowedAdminIds().has(session.userId)) {
    notFound();
  }

  const stripe = getStripeClient();
  const [balance, transactions] = await Promise.all([
    stripe.balance.retrieve(),
    stripe.balanceTransactions.list({ limit: 100 }),
  ]);

  const currency = balance.available[0]?.currency ?? balance.pending[0]?.currency ?? "usd";
  const available = balance.available.find((item) => item.currency === currency)?.amount ?? 0;
  const pending = balance.pending.find((item) => item.currency === currency)?.amount ?? 0;
  const totals = transactions.data.reduce(
    (result, transaction) => {
      const amount = transaction.currency === currency ? transaction.amount : 0;
      const absolute = Math.abs(amount);
      if (transaction.type === "transfer") result.transfers += absolute;
      if (transaction.type === "stripe_fee") result.stripeFees += absolute;
      if (transaction.type === "refund") result.refunds += absolute;
      if (transaction.type === "adjustment") result.disputes += absolute;
      return result;
    },
    { transfers: 0, stripeFees: 0, refunds: 0, disputes: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-zinc-500">Internal finance</p>
        <h1 className="mt-1 text-3xl font-semibold text-zinc-950">Platform balance</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
          Stripe is the source of truth for funds. Function Hour can display this balance and reconcile transfers, fees, refunds, and disputes, but does not hold money in the application database.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Available in Stripe" value={money(available, currency)} note="Ready for transfers or payouts" />
        <Metric label="Pending in Stripe" value={money(pending, currency)} note="Not available yet" />
        <Metric label="Organizer transfers" value={money(totals.transfers, currency)} note="Last 100 balance transactions" />
        <Metric label="Refunds + disputes" value={money(totals.refunds + totals.disputes, currency)} note="Last 100 balance transactions" />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Metric label="Stripe fees" value={money(totals.stripeFees, currency)} />
        <Metric label="Refunds" value={money(totals.refunds, currency)} />
        <Metric label="Disputes / adjustments" value={money(totals.disputes, currency)} />
      </section>

      <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-950">Settlement rules</h2>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-600">
          <li>• Paid ticket charges land on Function Hour’s Stripe balance; organizer payout setup does not block checkout.</li>
          <li>• Organizers can request their available net ticket proceeds to be transferred to their connected Stripe account.</li>
          <li>• Organizers remain responsible for event taxes and event-level obligations.</li>
          <li>• Refunds, disputes, and transfers remain visible to Operations for reconciliation.</li>
          <li>• Organizers remain responsible for their tax reporting and payments.</li>
          <li>• This page is restricted to Function Hour Operations admins.</li>
        </ul>
      </section>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
      {note ? <p className="mt-2 text-xs leading-5 text-zinc-500">{note}</p> : null}
    </div>
  );
}
