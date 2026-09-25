"use client";

import {
  ArrowDownToLine,
  CircleAlert,
  DollarSign,
  ReceiptText,
  RotateCcw,
} from "lucide-react";

type Reconciliation = {
  grossAmount: number;
  refundedAmount: number;
  netAmount: number;
  paidOrders: number;
  partiallyRefundedOrders: number;
  refundedOrders: number;
  trackedOrders: number;
  firstTrackedAt: number | null;
  currency: string;
  payoutStatus: "not_connected";
};

export default function PaymentReconciliation({
  reconciliation,
  periodDays,
}: {
  reconciliation: Reconciliation;
  periodDays: number;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#0c0b14]/90 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-violet-300" />
            <h3 className="text-base font-black">Payment reconciliation</h3>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Stripe-confirmed ticket orders from the last {periodDays} days.
          </p>
        </div>

        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
          {reconciliation.trackedOrders} tracked orders
        </span>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3">
        <MoneyCard
          label="Tracked gross"
          value={reconciliation.grossAmount}
          currency={reconciliation.currency}
          icon={DollarSign}
          tone="text-violet-300"
        />
        <MoneyCard
          label="Refunds"
          value={reconciliation.refundedAmount}
          currency={reconciliation.currency}
          icon={RotateCcw}
          tone="text-rose-300"
        />
        <MoneyCard
          label="Net sales"
          value={reconciliation.netAmount}
          currency={reconciliation.currency}
          icon={ArrowDownToLine}
          tone="text-emerald-300"
        />
      </div>

      <div className="grid gap-3 border-t border-white/[0.07] px-5 py-4 sm:grid-cols-3">
        <OrderCount label="Paid" value={reconciliation.paidOrders} />
        <OrderCount
          label="Partial refunds"
          value={reconciliation.partiallyRefundedOrders}
        />
        <OrderCount
          label="Full refunds"
          value={reconciliation.refundedOrders}
        />
      </div>

      <div className="flex items-start gap-3 border-t border-amber-400/15 bg-amber-400/[0.06] px-5 py-4">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <div>
          <p className="text-xs font-black text-amber-100">
            Organizer transfer tracking
          </p>
          <p className="mt-1 text-[11px] leading-5 text-amber-100/55">
            Net sales are recorded after refunds. Organizers can request available funds from the Payouts page; Stripe confirms transfers and handles bank payout timing.
          </p>
        </div>
      </div>

      {reconciliation.firstTrackedAt ? (
        <p className="border-t border-white/[0.06] px-5 py-3 text-[9px] font-bold text-zinc-700">
          Ledger coverage begins {formatDate(reconciliation.firstTrackedAt)}. Earlier sales may appear in revenue totals but not this reconciliation panel.
        </p>
      ) : null}
    </section>
  );
}

function MoneyCard({
  label,
  value,
  currency,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  icon: typeof DollarSign;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="mt-3 text-xl font-black tabular-nums">
        {formatMoney(value, currency)}
      </p>
    </div>
  );
}

function OrderCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="text-[10px] font-bold text-zinc-600">{label}</span>
      <span className="text-xs font-black tabular-nums">{value}</span>
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}
