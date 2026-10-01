"use client";

import { useCallback, useEffect, useState } from "react";

type PendingRequest = {
  requestId: string;
  status: "requested" | "processing";
  organizerId: string;
  stripeAccountId: string;
  amount: number;
  createdAt: number;
};

export default function PayoutRequestReview() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [missingTickets, setMissingTickets] = useState<{ stripeCheckoutSessionId: string; paidAt: number }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/payout-requests", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load payout requests.");
      setRequests(data.requests);
      setMissingTickets(data.missingTickets);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load payout requests.");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function review(request: PendingRequest, action: "approve" | "reject" | "reconcile") {
    const transferId = action === "reconcile"
      ? window.prompt("Enter the Stripe transfer ID after verifying this request in Stripe:")
      : null;
    if (action === "reconcile" && !transferId) return;
    const prompt = action === "approve"
      ? `Review refunds, disputes, and the Stripe balance first. Transfer $${request.amount.toFixed(2)} to ${request.stripeAccountId}?`
      : action === "reject" ? `Decline this $${request.amount.toFixed(2)} request? The organizer can request again.`
      : `Confirm Stripe transfer ${transferId} belongs to this request?`;
    if (!window.confirm(prompt)) return;
    setBusy(request.requestId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/payout-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.requestId, action, transferId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to review payout.");
      setMessage(action === "reject" ? "Request declined." : "Transfer recorded and reconciled.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to review payout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-950">Organizer payout requests</h2>
        <button type="button" onClick={() => void refresh()} className="rounded-lg border px-3 py-2 text-sm text-zinc-950">Refresh</button>
      </div>
      <p className="mt-2 text-sm text-zinc-700">Confirm ticket fulfillment, refunds, disputes, connected-account identity, and the reserve you need before approving a transfer. Stripe availability alone does not establish that proceeds are safe to release.</p>
      {message ? <p role="status" className="mt-3 text-sm text-zinc-900">{message}</p> : null}
      {missingTickets.length ? <div role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-950">
        <p className="font-semibold">Paid orders missing tickets in the latest 500 orders. Reconcile before approving transfers.</p>
        {missingTickets.map((order) => <p className="mt-2 font-mono text-xs" key={order.stripeCheckoutSessionId}>{order.stripeCheckoutSessionId} · {new Date(order.paidAt).toLocaleString()}</p>)}
      </div> : null}
      {requests.length === 0 ? <p className="mt-4 text-sm text-zinc-700">No pending requests in the latest 500 records.</p> : null}
      <ul className="mt-4 space-y-3">
        {requests.map((request) => (
          <li key={request.requestId} className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-950">
            <p className="font-semibold">${request.amount.toFixed(2)} · Organizer {request.organizerId}</p>
            <p className="mt-1 text-zinc-700">{request.status === "processing" ? "Transfer processing — reconcile in Stripe before any further action" : "Awaiting review"} · Stripe account {request.stripeAccountId} · Requested {new Date(request.createdAt).toLocaleString()}</p>
            <div className="mt-3 flex gap-2">
              {request.status === "processing" ? <button type="button" disabled={Boolean(busy)} onClick={() => void review(request, "reconcile")} className="rounded-lg bg-zinc-950 px-4 py-2 font-semibold text-white disabled:opacity-50">Reconcile transfer</button> : <>
                <button type="button" disabled={Boolean(busy)} onClick={() => void review(request, "approve")} className="rounded-lg bg-zinc-950 px-4 py-2 font-semibold text-white disabled:opacity-50">Approve transfer</button>
                <button type="button" disabled={Boolean(busy)} onClick={() => void review(request, "reject")} className="rounded-lg border border-zinc-300 px-4 py-2 font-semibold disabled:opacity-50">Decline</button>
              </>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
