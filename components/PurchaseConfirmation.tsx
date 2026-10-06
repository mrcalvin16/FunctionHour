"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function PurchaseConfirmation({ type }: { type: "ticket" | "merch" }) {
  const [status, setStatus] = useState<"hidden" | "checking" | "paid" | "pending">("hidden");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    const session = params.get("session_id");
    if (!session) return;
    let cancelled = false;
    setStatus("checking");
    fetch(`/api/stripe/purchase-status?session_id=${encodeURIComponent(session)}`, { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!cancelled) setStatus(response.ok && result.paid && result.type === type ? "paid" : "pending"); })
      .catch(() => { if (!cancelled) setStatus("pending"); });
    return () => { cancelled = true; };
  }, [type]);
  if (status === "hidden") return null;
  return <section role="status" aria-live="polite" className="relative mb-6 flex flex-wrap items-center gap-4 rounded-3xl border border-violet-200 bg-violet-50 p-6 text-zinc-900 shadow-sm">
    <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-violet-700">{status === "paid" ? <CheckCircle2 size={32} /> : <Loader2 size={28} className={status === "checking" ? "animate-spin motion-reduce:animate-none" : ""} />}</span>
    <div className="min-w-0 flex-1"><h2 className="text-xl font-black">{status === "paid" ? "Thank you — payment confirmed!" : status === "checking" ? "Confirming your payment…" : "Your purchase is being confirmed"}</h2><p className="mt-1 text-sm text-zinc-700">{status === "paid" ? type === "ticket" ? "Your tickets will appear below once processing finishes. You can also check your order history." : "Your merch purchase is paid. Track order confirmation and fulfillment in your merch orders." : "If you’ve paid, don’t purchase again. Check your order history or contact Help if your order doesn’t appear."}</p></div>
    <Link href={type === "ticket" ? "/my-orders" : "/my-merch-orders"} className="rounded-xl border border-violet-300 bg-white px-4 py-3 text-sm font-bold text-violet-900">View orders</Link>
  </section>;
}
