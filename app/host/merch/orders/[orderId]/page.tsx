"use client";

import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function MerchOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const typedOrderId = orderId as Id<"merchOrders">;
  const order = useQuery(api.merch.getOrganizerOrder, {
    orderId: typedOrderId,
  });
  const update = useMutation(api.merch.updateFulfillment);
  const [status, setStatus] = useState<
    | "unfulfilled"
    | "processing"
    | "ready_for_pickup"
    | "shipped"
    | "fulfilled"
    | "cancelled"
  >("unfulfilled");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  useEffect(() => {
    if (order) {
      setStatus(order.fulfillmentStatus ?? "unfulfilled");
      setTrackingNumber(order.trackingNumber ?? "");
      setTrackingUrl(order.trackingUrl ?? "");
    }
  }, [order]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setEmailNotice("");
    const result = await update({
      orderId: typedOrderId,
      fulfillmentStatus: status,
      trackingNumber: trackingNumber || undefined,
      trackingUrl: trackingUrl || undefined,
    });
    if (status === "shipped" || status === "ready_for_pickup") {
      try {
        const response = await fetch("/api/email/merch-fulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, expectedUpdatedAt: result.updatedAt }),
        });
        if (!response.ok) throw new Error("Notification email could not be sent.");
        const delivery = await response.json();
        setEmailNotice(delivery.sent ? "Customer notified by email." : "Fulfillment saved. No customer email was sent.");
      } catch {
        setEmailNotice("Fulfillment saved, but the customer email could not be sent. Tracking remains available in My Merch Orders.");
      }
    } else {
      setEmailNotice("Fulfillment saved.");
    }
    setSaved(true);
  }
  async function syncPrintful() {
    setSyncing(true);
    setSyncError("");
    try {
      const response = await fetch("/api/printful/order-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to sync Printful status.");
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : "Unable to sync Printful status.",
      );
    } finally {
      setSyncing(false);
    }
  }
  if (order === undefined)
    return <div className="p-8 text-zinc-500">Loading order...</div>;
  if (!order) return <div className="p-8">Order not found.</div>;
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-400">
            Merch fulfillment
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Order #{orderId.slice(-8).toUpperCase()}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {order.eventName} · {order.buyerName || order.buyerEmail}
          </p>
        </div>
        <Link href="/host/merch" className="text-xs font-black text-zinc-500">
          Back
        </Link>
      </div>
      {order.fulfillmentMethod === "printful" ? (
        <div
          className={`mt-5 rounded-xl border p-4 text-xs ${order.printfulError || syncError ? "border-red-400/20 bg-red-400/10 text-red-300" : "border-violet-400/20 bg-violet-400/10 text-violet-200"}`}
        >
          <p className="font-black">
            Printful · {order.printfulStatus ?? "Awaiting submission"}
          </p>
          <p className="mt-1">
            {syncError || order.printfulError ||
              (order.printfulOrderId
                ? `Order ${order.printfulOrderId}`
                : "The paid order will be submitted from the Stripe webhook.")}
          </p>
          {order.printfulOrderId ? (
            <button type="button" disabled={syncing} onClick={syncPrintful} className="mt-3 min-h-9 rounded-lg border border-current/20 px-3 font-black disabled:opacity-50">
              {syncing ? "Syncing..." : "Sync status"}
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[1.75rem] border border-white/[.08] bg-white/[.035] p-5">
          <h3 className="font-black">Order items</h3>
          <div className="mt-4 divide-y divide-white/[.06]">
            {order.items.map((item) => (
              <div key={item._id} className="flex justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-black">{item.productName}</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    {item.variantName || item.sku || "Standard"} · Qty{" "}
                    {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-black">{currency(item.lineTotal)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t border-white/[.08] pt-4 text-sm">
            <Row
              label="Subtotal"
              value={currency(order.subtotal ?? order.total)}
            />
            <Row label="Shipping" value={currency(order.shippingAmount ?? 0)} />
            <Row label="Tax" value={currency(order.taxAmount ?? 0)} />
            <Row label="Total" value={currency(order.total)} strong />
          </div>
          {order.shippingAddress ? (
            <div className="mt-5 rounded-xl bg-black/25 p-4">
              <p className="text-[10px] font-black uppercase text-zinc-600">
                Ship to
              </p>
              <p className="mt-2 text-sm">{order.shippingName}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {order.shippingAddress}
              </p>
            </div>
          ) : null}
        </section>
        <form
          onSubmit={submit}
          className="h-fit rounded-[1.75rem] border border-white/[.08] bg-white/[.035] p-5"
        >
          <h3 className="font-black">Fulfillment</h3>
          <label className="mt-4 block text-[10px] font-black uppercase text-zinc-600">
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setSaved(false);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-white/[.08] bg-[#0d0b13] px-3 text-sm text-white"
            >
              <option value="unfulfilled">Unfulfilled</option>
              <option value="processing">Processing</option>
              <option value="ready_for_pickup">Ready for pickup</option>
              <option value="shipped">Shipped</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="mt-4 block text-[10px] font-black uppercase text-zinc-600">
            Tracking number
            <input
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value);
                setSaved(false);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-white/[.08] bg-black/30 px-3 text-sm"
            />
          </label>
          <label className="mt-4 block text-[10px] font-black uppercase text-zinc-600">
            Tracking URL
            <input
              type="url"
              value={trackingUrl}
              onChange={(e) => {
                setTrackingUrl(e.target.value);
                setSaved(false);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-white/[.08] bg-black/30 px-3 text-sm"
            />
          </label>
          {emailNotice && <p role="status" className="mt-4 rounded-xl border border-white/[.08] bg-black/20 p-3 text-xs leading-5 text-zinc-300">{emailNotice}</p>}
          <button className="mt-5 min-h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 text-xs font-black">
            {saved ? "Saved" : "Save fulfillment"}
          </button>
        </form>
      </div>
    </div>
  );
}
function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${strong ? "font-black" : "text-zinc-500"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
