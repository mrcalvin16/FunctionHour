"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type LedgerRow = {
  requestId: string; organizerId: string; organizer: { name: string | null; email: string | null };
  stripeAccountId: string; stripeTransferId: string | null;
  amount: number; currency: string; status: "requested" | "processing" | "transferred" | "rejected";
  reviewedBy: string | null; reviewNote: string | null; createdAt: number; updatedAt: number;
};
type Detail = {
  payout: Omit<LedgerRow, "organizer">;
  summary: { earnedAmount: number; requestedAmount: number; transferredAmount: number;
    requestableAmount: number; openDisputeCount: number };
  currentAccountId: string | null;
  transfer: { id: string; amount: number; amountReversed: number; destination: string | null;
    currency: string; matchesRequest: boolean; createdAt: number } | null;
  verification: "verified" | "mismatch" | "not_recorded" | "unavailable";
};

function money(amount: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

export default function PayoutLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/payout-ledger", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load payout history.");
      setRows(result.requests);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load payout history.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (filter !== "all" && row.status !== filter) return false;
    const text = `${row.requestId} ${row.organizerId} ${row.organizer.name || ""} ${row.organizer.email || ""} ${row.stripeTransferId || ""}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }), [rows, query, filter]);

  async function inspect(requestId: string) {
    setSelectedId(requestId); setDetail(null); setDetailLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/payout-ledger?requestId=${encodeURIComponent(requestId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to inspect request.");
      setDetail(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to inspect request.");
    } finally { setDetailLoading(false); }
  }

  function inspectExact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const exact = query.trim();
    if (/^[a-z0-9]{20,40}$/.test(exact)) void inspect(exact);
  }

  return <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold text-zinc-950">Payout ledger</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-700">Recent organizer requests, including transfers and declines. Select one to compare the recorded transfer with Stripe.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Refresh</button>
    </div>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <form onSubmit={inspectExact} className="flex-1">
        <label className="block text-xs font-bold text-zinc-800">Search recent requests or open an exact request ID
          <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={254} placeholder="Organizer, email, request ID, transfer ID" className="mt-1 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-950" />
        </label>
      </form>
      <label className="text-xs font-bold text-zinc-800">Status
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-1 block min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm text-zinc-950">
          <option value="all">All</option><option value="requested">Requested</option><option value="processing">Processing</option><option value="transferred">Transferred</option><option value="rejected">Rejected</option>
        </select>
      </label>
    </div>
    <p className="mt-2 text-xs text-zinc-600">Showing the latest 200 requests. Paste an older exact request ID and press Enter to inspect it.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {loading ? <p className="mt-6 text-sm text-zinc-700">Loading payout history…</p> : filtered.length === 0 ? <p className="mt-6 text-sm text-zinc-700">No matching payout requests.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
      <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-700"><tr><th className="p-3">Organizer</th><th className="p-3">Request</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
      <tbody>{filtered.map((row) => <tr key={row.requestId} className="border-b border-zinc-100 align-top text-zinc-900">
        <td className="p-3"><strong className="block">{row.organizer.name || row.organizerId}</strong><span className="text-xs text-zinc-700">{row.organizer.email || row.organizerId}</span></td>
        <td className="p-3"><span className="block">{new Date(row.createdAt).toLocaleString()}</span><span className="break-all font-mono text-xs text-zinc-700">{row.requestId}</span></td>
        <td className="p-3 font-bold">{money(row.amount, row.currency)}</td>
        <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === "processing" ? "bg-amber-100 text-amber-950" : row.status === "transferred" ? "bg-emerald-100 text-emerald-950" : "bg-zinc-100 text-zinc-900"}`}>{row.status}</span></td>
        <td className="p-3"><button type="button" onClick={() => void inspect(row.requestId)} className="font-bold text-violet-800 underline">Inspect</button></td>
      </tr>)}</tbody>
    </table></div>}
    {selectedId && <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-sm text-zinc-950">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold">Request {selectedId}</h3><button type="button" onClick={() => { setSelectedId(""); setDetail(null); }} className="font-semibold text-violet-800 underline">Close</button></div>
      {detailLoading ? <p className="mt-3">Checking the ledger and Stripe…</p> : detail && <>
        <p className="mt-3">{money(detail.payout.amount, detail.payout.currency)} · {detail.payout.status} · {new Date(detail.payout.createdAt).toLocaleString()}</p>
        <p className="mt-1 break-all">Organizer: {detail.payout.organizerId} · Destination: {detail.payout.stripeAccountId}</p>
        {detail.currentAccountId !== detail.payout.stripeAccountId && <p role="alert" className="mt-3 font-bold text-red-800">The organizer’s current connected account differs from the request destination. Review before transfer.</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Amount label="Recorded proceeds" amount={detail.summary.earnedAmount} />
          <Amount label="Requested or paid" amount={detail.summary.requestedAmount} />
          <Amount label="Transferred" amount={detail.summary.transferredAmount} />
          <Amount label="Unrequested" amount={detail.summary.requestableAmount} />
        </div>
        <p className="mt-3 text-xs text-zinc-700">Amounts come from Function Hour’s order ledger; Stripe’s platform balance and any reserves are separate. {detail.summary.openDisputeCount} open dispute(s).</p>
        {detail.payout.stripeTransferId ? <div className="mt-4 rounded-xl bg-white p-4">
          <strong>Stripe transfer: {detail.verification === "verified" ? "Verified" : detail.verification === "mismatch" ? "Mismatch or reversed" : "Could not verify"}</strong>
          {detail.transfer && <p className="mt-1">{money(detail.transfer.amount / 100, detail.transfer.currency)} sent · {money(detail.transfer.amountReversed / 100, detail.transfer.currency)} reversed · {new Date(detail.transfer.createdAt).toLocaleString()}</p>}
          <a target="_blank" rel="noreferrer" href={`https://dashboard.stripe.com/transfers/${detail.payout.stripeTransferId}`} className="mt-2 inline-block font-bold text-violet-800 underline">Open transfer in Stripe</a>
        </div> : <p className={`mt-4 font-semibold ${detail.payout.status === "transferred" ? "text-red-800" : "text-amber-900"}`}>{detail.payout.status === "processing" ? "Processing without a recorded transfer. Inspect Stripe before reconciling." : detail.payout.status === "transferred" ? "Transferred without a recorded transfer ID. Investigate." : "No transfer recorded."}</p>}
        {detail.payout.reviewedBy && <p className="mt-3 text-xs">Reviewed by {detail.payout.reviewedBy} · Updated {new Date(detail.payout.updatedAt).toLocaleString()}</p>}
        {detail.payout.reviewNote && <p className="mt-2 text-xs">Note: {detail.payout.reviewNote}</p>}
        {(detail.payout.status === "requested" || detail.payout.status === "processing") && <a href="/admin/finance#payout-requests" className="mt-4 inline-block rounded-xl bg-violet-700 px-4 py-2 font-bold text-white">Go to approval queue</a>}
      </>}
    </div>}
  </section>;
}

function Amount({ label, amount }: { label: string; amount: number }) {
  return <div className="rounded-xl bg-white p-3"><p className="text-xs font-bold text-zinc-700">{label}</p><p className="mt-1 text-lg font-bold">{money(amount)}</p></div>;
}
