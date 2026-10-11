"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Download, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

export default function OrdersPage() {
  const orders = useQuery(api.tickets.getOrganizerOrders, { limit: 500 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const visible = useMemo(
    () =>
      (orders ?? []).filter((order) => {
        const term = search.trim().toLowerCase();
        return (
          (status === "all" || order.status === status) &&
          (!term ||
            `${order.buyerName ?? ""} ${order.buyerEmail} ${order.eventName} ${order.stripeCheckoutSessionId}`
              .toLowerCase()
              .includes(term))
        );
      }),
    [orders, search, status],
  );
  const summary = useMemo(
    () => ({
      gross: (orders ?? []).reduce((sum, order) => sum + order.grossAmount, 0),
      refunds: (orders ?? []).reduce(
        (sum, order) => sum + order.refundedAmount,
        0,
      ),
      net: (orders ?? []).reduce((sum, order) => sum + order.netAmount, 0),
    }),
    [orders],
  );
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
            Revenue operations
          </p>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Ticket Orders
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Stripe-confirmed ticket transactions and refund reconciliation.
          </p>
        </div>
        <Link href="/host/exports" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-xs font-black text-white"><Download className="h-4 w-4" /> Secure exports</Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Gross sales" value={summary.gross} />
        <Metric label="Refunded" value={summary.refunds} />
        <Metric label="Net sales" value={summary.net} />
      </div>
      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/[.08] bg-white/[.035]">
        <div className="grid gap-3 border-b border-white/[.07] p-4 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders, customers, or events"
              className="min-h-11 w-full rounded-xl border border-white/[.08] bg-black/30 pl-11 pr-4 text-sm outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-h-11 rounded-xl border border-white/[.08] bg-[#0d0b13] px-4 text-sm font-bold"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partially_refunded">Partially refunded</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        {orders === undefined ? (
          <div className="h-64 animate-pulse bg-white/[.02]" />
        ) : visible.length ? (
          <div className="divide-y divide-white/[.06]">
            {visible.map((order) => (
              <article
                key={order._id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="text-sm font-black">{order.eventName}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {order.buyerName || "Customer"} · {order.buyerEmail}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-zinc-300">
                    {order.quantity} ticket{order.quantity === 1 ? "" : "s"} ·{" "}
                    {new Date(order.paidAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 font-mono text-[9px] text-zinc-700">
                    {order.stripeCheckoutSessionId}
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-sm font-black text-orange-300">
                    {money(order.netAmount, order.currency)}
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase text-zinc-600">
                    {order.status.replaceAll("_", " ")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-zinc-700" />
            <p className="mt-4 text-sm font-black">No matching orders</p>
            <p className="mt-1 text-xs text-zinc-600">
              Paid ticket orders will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
      <p className="text-xs font-bold text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-black">{money(value, "usd")}</p>
    </div>
  );
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(value);
}
