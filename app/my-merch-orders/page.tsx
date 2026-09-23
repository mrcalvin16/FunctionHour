"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowLeft, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";

export default function MyMerchOrdersPage() {
  const orders = useQuery(api.merch.getMyMerchOrders, {});

  if (orders === undefined) {
    return <main className="min-h-screen bg-[#07060c] px-4 py-16 text-center text-zinc-400">Loading your merch orders…</main>;
  }

  return (
    <main className="min-h-screen bg-[#07060c] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/my-tickets" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-violet-400/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> My tickets
        </Link>
        <header className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">Your Function Hour orders</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Merch orders</h1>
          <p className="mt-3 text-sm text-zinc-400">Payment, pickup, and shipping updates for your event merch.</p>
        </header>

        {!orders.length ? (
          <section className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-8 text-center sm:p-12">
            <ShoppingBag className="mx-auto h-9 w-9 text-violet-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-black">No merch orders yet</h2>
            <p className="mt-2 text-sm text-zinc-400">When you buy event merchandise, your order and fulfillment updates will appear here.</p>
            <Link href="/events" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 text-sm font-black text-white">Explore events</Link>
          </section>
        ) : (
          <div className="mt-8 space-y-4">
            {orders.map((order) => (
              <article key={order._id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold text-violet-300">{order.eventName}</p>
                    <h2 className="mt-1 text-lg font-black">Order · {new Date(order.paidAt).toLocaleDateString()}</h2>
                    <p className="mt-1 text-xs capitalize text-zinc-500">{order.status.replaceAll("_", " ")} · {order.fulfillmentMethod.replaceAll("_", " ")}</p>
                  </div>
                  <p className="text-xl font-black">{new Intl.NumberFormat("en-US", { style: "currency", currency: order.currency.toUpperCase() }).format(order.total)}</p>
                </div>
                <div className="mt-4 divide-y divide-white/[0.07] rounded-xl border border-white/[0.07] px-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between gap-3 py-3 text-sm">
                      <span className="text-zinc-300">{item.productName}{item.variantName ? " · " + item.variantName : ""}</span>
                      <span className="shrink-0 text-zinc-500">× {item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/25 p-4">
                  <div className="flex items-center gap-3">
                    {order.fulfillmentMethod === "pickup" ? <PackageCheck className="h-5 w-5 text-violet-300" aria-hidden="true" /> : <Truck className="h-5 w-5 text-violet-300" aria-hidden="true" />}
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-zinc-300">Fulfillment</p>
                      <p className="mt-1 text-sm capitalize text-zinc-400">{order.fulfillmentStatus.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                  {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-violet-300 underline underline-offset-4">Track shipment</a> : order.trackingNumber ? <span className="text-sm text-zinc-300">Tracking: {order.trackingNumber}</span> : <span className="text-xs text-zinc-500">{order.fulfillmentMethod === "pickup" ? order.eventLocation || "Pickup details will be shared by the host." : "Shipping updates will appear here."}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
