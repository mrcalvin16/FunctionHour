"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const money = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(amount);
const date = (time: number) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(time));

export default function PurchaseHistory() {
  const tickets = useQuery(api.tickets.getUserTickets, {});
  const orders = useQuery(api.tickets.getMyOrders, {});
  const merch = useQuery(api.merch.getMyMerchOrders, {});
  if (!orders || !merch || !tickets) return <p role="status" className="py-8 text-zinc-700">Loading purchase history…</p>;
  const history = [
    ...orders.map(order => ({ kind: "ticket" as const, order, paidAt: order.paidAt })),
    ...merch.map(order => ({ kind: "merch" as const, order, paidAt: order.paidAt })),
  ].sort((a,b) => b.paidAt - a.paidAt);
  if (!history.length) return <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center"><h2 className="text-xl font-bold">No purchases yet</h2><p className="mt-2 text-zinc-700">Paid ticket and merchandise orders appear here. Free and complimentary passes are in Your tickets.</p><Link href="/events" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 font-bold text-white">Browse events</Link></div>;
  return <div className="space-y-4">{history.map(entry => {
    const { order } = entry;
    return <article key={`${entry.kind}-${order._id}`} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-violet-800">{entry.kind === "ticket" ? "Ticket order" : "Merchandise order"}</p><h2 className="mt-2 break-words text-xl font-bold">{order.eventName}</h2><p className="mt-2 text-sm text-zinc-700">Purchased {date(order.paidAt)}</p></div>
        <div><p className="text-xl font-bold">{money(entry.kind === "ticket" ? entry.order.grossAmount : entry.order.total, order.currency)}</p><p className="mt-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold capitalize text-zinc-800">{order.status.replaceAll("_", " ")}</p></div>
      </div>
      <details className="mt-4 border-t border-zinc-200 pt-3"><summary className="cursor-pointer py-2 text-sm font-bold text-zinc-800">Order details</summary><p className="mt-2 break-all text-xs text-zinc-600">Reference: {order._id}</p>
      {entry.kind === "ticket" ? <div className="mt-3 space-y-3">
        <p className="text-sm text-zinc-700">{entry.order.quantity} {entry.order.quantity === 1 ? "ticket" : "tickets"}{entry.order.refundedAmount > 0 ? ` · Refunded ${money(entry.order.refundedAmount, order.currency)}` : ""}</p>
        <p className="text-sm text-zinc-700">{entry.order.status === "refunded" ? "This order was refunded." : entry.order.ticketCount >= entry.order.quantity ? "Your passes are available in Your tickets." : "Payment recorded. Tickets are still processing."}</p>
        <div className="flex flex-wrap gap-3">{tickets.filter(ticket => ticket.stripeCheckoutSessionId === entry.order.stripeCheckoutSessionId).map(ticket => <Link key={ticket._id} href={`/tickets/${ticket._id}`} className="inline-flex min-h-11 items-center rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-bold text-violet-900">View ticket</Link>)}<Link href={`/events/${entry.order.eventId}`} className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-zinc-800 underline underline-offset-4">View event</Link></div>
      </div> : <div className="mt-3 space-y-3">
        {entry.order.items.map((item,index) => <p key={index} className="text-sm text-zinc-700">{item.productName}{item.variantName ? ` · ${item.variantName}` : ""} × {item.quantity}</p>)}
        <p className="text-sm capitalize text-zinc-700">{entry.order.fulfillmentMethod.replaceAll("_", " ")} · {entry.order.fulfillmentStatus.replaceAll("_", " ")}</p>
        {entry.order.trackingUrl ? <a href={entry.order.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-bold text-violet-900 underline">Track shipment</a> : entry.order.trackingNumber ? <p className="text-sm text-zinc-700">Tracking: {entry.order.trackingNumber}</p> : <p className="text-sm text-zinc-700">{entry.order.fulfillmentMethod === "pickup" ? entry.order.eventLocation || "Pickup details will be shared by the host." : "Shipping updates will appear here."}</p>}
      </div>}
      </details>
    </article>;
  })}</div>;
}
