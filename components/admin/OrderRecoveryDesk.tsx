"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type OrderRow = {
  sessionId: string; paymentIntentId: string | null; eventId: string | null;
  eventName: string; buyerEmail: string; amount: number; currency: string;
  paidAt: number; paymentStatus: string; expectedQuantity: number;
  order: { id: string; status: string; refundedAmount: number; disputeStatus?: string } | null;
  ticketCount: number; activeTicketCount: number;
  recoveryActions: { status: string; reviewedBy: string; createdAt: number; emailStatus?: string }[];
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

function Step({ label, done, warning }: { label: string; done: boolean; warning?: boolean }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${warning ? "bg-amber-100 text-amber-950" : done ? "bg-emerald-100 text-emerald-950" : "bg-zinc-100 text-zinc-700"}`}>
    {done ? "✓ " : warning ? "! " : "○ "}{label}
  </span>;
}

export default function OrderRecoveryDesk({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [reviewId, setReviewId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (term: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/orders?q=${encodeURIComponent(term)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load orders.");
      setRows(result.rows);
      setHasMore(result.hasMore);
      setSearched(term);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load orders.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(""); }, [refresh]);

  async function recover(row: OrderRow) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: row.sessionId, confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Recovery failed.");
      setNotice(result.status === "already_fulfilled" ? "This order is already fulfilled. No tickets were duplicated."
        : `Order reconciled with ${result.ticketCount} ticket(s). Email provider: ${result.emailStatus}.`);
      setReviewId("");
      setConfirmation("");
      await refresh(searched);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recovery failed.");
    } finally { setBusy(false); }
  }

  const problems = rows.filter((row) => row.paymentStatus === "paid" && (!row.order || row.ticketCount === 0));
  if (compact) return <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-bold text-zinc-950">Order recovery</h2>
    {loading ? <p className="mt-2 text-sm text-zinc-700">Checking recent paid sessions…</p>
      : error ? <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>
      : <p className="mt-2 text-sm text-zinc-700"><strong className={problems.length ? "text-red-700" : "text-zinc-950"}>{problems.length}</strong> paid session(s) missing an order or tickets among the latest completed Stripe sessions.</p>}
    <a href="/admin/orders" className="mt-4 inline-flex rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">Open order desk</a>
  </section>;

  return <section>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); void refresh(search.trim()); }} className="mt-6 flex flex-col gap-3 sm:flex-row">
      <label className="flex-1 text-sm font-semibold text-zinc-950">Find a purchase
        <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={254}
          placeholder="Email, Checkout Session, Payment ID, or recent event name"
          className="mt-1 block min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950" />
      </label>
      <button type="submit" disabled={loading} className="self-end rounded-xl bg-violet-700 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">Search</button>
    </form>
    <p className="mt-2 text-xs text-zinc-600">Email and Stripe IDs search matching purchases. Event-name search covers the latest 100 completed sessions.</p>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">{notice}</p>}
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-zinc-950">{searched ? "Search results" : "Recent ticket checkouts"}</h2>
      <button type="button" onClick={() => void refresh(searched)} disabled={loading} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold disabled:opacity-60">Refresh</button>
    </div>
    {loading ? <p className="mt-5 text-sm text-zinc-700">Checking Stripe and ticket records…</p>
      : rows.length === 0 ? <p className="mt-5 rounded-xl border bg-white p-5 text-sm text-zinc-700">No matching ticket checkouts found.</p>
      : <div className="mt-4 space-y-4">{rows.map((row) => {
        const needsRecovery = row.paymentStatus === "paid" && row.order?.status !== "refunded" && (!row.order || row.ticketCount === 0);
        const mismatch = row.ticketCount > 0 && row.ticketCount !== row.expectedQuantity;
        return <article key={row.sessionId} className={`rounded-2xl border bg-white p-5 shadow-sm ${needsRecovery || mismatch ? "border-amber-300" : "border-zinc-200"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-bold text-zinc-950">{row.eventName}</h3><p className="mt-1 text-sm text-zinc-700">{row.buyerEmail} · {new Date(row.paidAt).toLocaleString()} · {money(row.amount, row.currency)}</p></div>
            {needsRecovery && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">Needs recovery</span>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Order progress">
            <Step label="Payment confirmed" done={row.paymentStatus === "paid"} />
            <Step label="Order recorded" done={Boolean(row.order)} warning={row.paymentStatus === "paid" && !row.order} />
            <Step label={`Tickets ${row.ticketCount}/${row.expectedQuantity}`} done={row.expectedQuantity > 0 && row.ticketCount === row.expectedQuantity} warning={row.paymentStatus === "paid" && row.ticketCount !== row.expectedQuantity} />
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">Email delivery not tracked</span>
          </div>
          {row.order?.status !== "paid" && row.order && <p className="mt-3 text-sm font-semibold text-amber-900">Order: {row.order.status.replaceAll("_", " ")}{row.order.disputeStatus ? ` · Dispute: ${row.order.disputeStatus}` : ""}</p>}
          {!row.expectedQuantity && <p className="mt-3 text-sm font-semibold text-red-800">Checkout ticket selection is missing or invalid. Review manually.</p>}
          {row.recoveryActions.length > 0 && <p className="mt-3 text-xs text-zinc-700">Last recovery: {row.recoveryActions[0].status} · {new Date(row.recoveryActions[0].createdAt).toLocaleString()} · {row.recoveryActions[0].reviewedBy}{row.recoveryActions[0].emailStatus ? ` · Email ${row.recoveryActions[0].emailStatus}` : ""}</p>}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-700">
            <span className="break-all">Session: {row.sessionId}</span>
            {row.paymentIntentId && <a className="font-semibold text-violet-800 underline" href={`https://dashboard.stripe.com/payments/${row.paymentIntentId}`} target="_blank" rel="noreferrer">Open in Stripe</a>}
            {row.eventId && <a className="font-semibold text-violet-800 underline" href={`/events/${row.eventId}`} target="_blank" rel="noreferrer">View event</a>}
          </div>
          {(needsRecovery || mismatch) && row.paymentStatus === "paid" && row.expectedQuantity > 0 && <div className="mt-4">
            {reviewId === row.sessionId ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-zinc-950">
              <p className="font-bold">Review Stripe payment, refunds, and the buyer before continuing.</p>
              <p className="mt-1">Recovery checks the live Stripe payment again and uses the existing idempotent ticket and order mutations. A partial ticket count requires manual review.</p>
              <label className="mt-3 block font-semibold">Type RECOVER {row.sessionId}
                <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 font-mono text-xs" />
              </label>
              <div className="mt-3 flex gap-2"><button type="button" disabled={busy || confirmation !== `RECOVER ${row.sessionId}` || mismatch} onClick={() => void recover(row)} className="rounded-lg bg-zinc-950 px-4 py-2 font-bold text-white disabled:opacity-50">Recover paid order</button><button type="button" onClick={() => { setReviewId(""); setConfirmation(""); }} className="rounded-lg border border-zinc-300 px-4 py-2 font-semibold">Cancel</button></div>
            </div> : <button type="button" onClick={() => { setReviewId(row.sessionId); setConfirmation(""); }} className="rounded-xl border border-amber-400 px-4 py-2 text-sm font-bold text-amber-950">Review recovery</button>}
          </div>}
        </article>;
      })}</div>}
    {hasMore && <p className="mt-4 text-xs text-zinc-600">Showing the latest 100 completed sessions. Search by purchase email or Stripe ID for older records.</p>}
  </section>;
}
