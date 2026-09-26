"use client";

import Link from "next/link";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function MyOrdersPage() {
  const { user, isLoaded } = useUser();
  const orders = useQuery(api.tickets.getMyOrders, user ? {} : "skip");

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07060c] text-zinc-300">
        Loading orders...
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#07060c] px-5 py-16 text-white">
        <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Function Hour</p>
          <h1 className="mt-3 text-3xl font-bold">Your orders</h1>
          <p className="mt-3 text-zinc-400">Sign in to see your purchase history and ticket status.</p>
          <SignInButton mode="modal">
            <button className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black">Sign in</button>
          </SignInButton>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060c] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-15%] top-[-20%] h-[420px] w-[420px] rounded-full bg-violet-700/15 blur-[140px]" />
        <div className="absolute bottom-[-25%] right-[-10%] h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-[140px]" />
      </div>
      <section className="relative mx-auto max-w-5xl">
        <nav className="mb-8 flex items-center justify-between border-b border-white/[0.08] pb-5">
          <Link href="/events" className="text-sm font-black tracking-[-0.04em]">
            FUNCTION<span className="text-violet-400">HOUR</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/my-tickets" className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-zinc-300 hover:bg-white/[0.06]">
              My Tickets
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">Your account</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Orders</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">Purchase history, payment totals, and ticket fulfillment status.</p>
        </header>

        {orders === undefined ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-zinc-400">Loading purchase history…</div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-400/10 text-2xl text-violet-300">↗</div>
            <h2 className="mt-4 text-2xl font-semibold">No orders yet</h2>
            <p className="mt-2 text-zinc-400">When you purchase a ticket, your order and payment status will appear here.</p>
            <Link href="/events" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold text-black">Explore events</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const ready = order.ticketCount >= order.quantity;
              const refunded = order.status === "refunded";
              const statusLabel = refunded ? "Refunded" : order.status === "partially_refunded" ? "Partially refunded" : "Paid";
              const total = order.grossAmount + (order.refundedAmount > 0 ? 0 : 0);
              return (
                <article key={order._id} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Event order</p>
                      <h2 className="mt-2 text-xl font-bold">{order.eventName}</h2>
                      <p className="mt-2 text-sm text-zinc-400">
                        {order.quantity} {order.quantity === 1 ? "ticket" : "tickets"} · Purchased {formatDate(order.paidAt)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-bold">{formatMoney(total, order.currency)}</p>
                      <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${refunded ? "bg-zinc-700/60 text-zinc-200" : "bg-emerald-400/10 text-emerald-300"}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                  <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${ready ? "border-emerald-400/20 bg-emerald-400/[0.06]" : "border-amber-300/20 bg-amber-300/[0.06]"}`}>
                    <p className={`text-sm font-semibold ${ready ? "text-emerald-200" : "text-amber-100"}`}>
                      {ready ? "Tickets ready in My Tickets" : "Payment recorded · tickets still processing"}
                    </p>
                    <Link href={ready ? "/my-tickets" : `/events/${order.eventId}`} className="text-sm font-bold text-white underline decoration-white/30 underline-offset-4">
                      {ready ? "View tickets" : "View event"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <footer className="mt-8 flex flex-wrap gap-3 text-sm">
          <Link href="/my-tickets" className="text-zinc-400 hover:text-white">My Tickets</Link>
          <Link href="/events" className="text-zinc-400 hover:text-white">Browse events</Link>
        </footer>
      </section>
    </main>
  );
}
