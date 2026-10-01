"use client";

import { useCallback, useEffect, useState } from "react";

type Request = {
  _id: string;
  category: string;
  email: string;
  name?: string;
  message: string;
  eventUrl?: string;
  pagePath: string;
  status: "new" | "in_progress" | "resolved";
  notificationStatus: "pending" | "delivered" | "failed";
  createdAt: number;
};

export default function SupportRequestQueue() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/support-requests", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load requests.");
      setRequests(result.requests);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load requests.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function update(id: string, status: Request["status"]) {
    setBusy(id);
    try {
      const response = await fetch("/api/admin/support-requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update request.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update request.");
    } finally { setBusy(""); }
  }

  return <section className="mt-8">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Support requests</h2><button type="button" onClick={() => void refresh()} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold">Refresh</button></div>
    <p className="mt-2 text-sm text-zinc-700">Latest 100 requests. Reply to the contact email from operations@functionhour.com. Only mark resolved after follow-up.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {loading ? <p className="mt-4">Loading requests…</p> : requests.length === 0 ? <p className="mt-4 rounded-xl border p-5 text-sm">No support requests yet.</p> :
      <div className="mt-5 space-y-4">{requests.map((item) => <article key={item._id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold capitalize">{item.category.replaceAll("_", " ")} · {item.status.replaceAll("_", " ")}</h3><time className="text-xs text-zinc-700">{new Date(item.createdAt).toLocaleString()}</time></div>
        <p className="mt-2 text-sm text-zinc-700">{item.name || "Visitor"} · <a className="font-semibold text-violet-700 underline" href={`mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(`Function Hour support request ${item._id}`)}`}>{item.email}</a></p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-950">{item.message}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-700"><span>Reference: {item._id}</span><span>Email alert: {item.notificationStatus}</span><span>Page: {item.pagePath}</span>{item.eventUrl && <a className="text-violet-700 underline" href={item.eventUrl}>Event</a>}</div>
        <div className="mt-4 flex flex-wrap gap-2">{(["new", "in_progress", "resolved"] as const).map((status) => <button key={status} type="button" disabled={busy === item._id || item.status === status} onClick={() => void update(item._id, status)} className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold capitalize disabled:opacity-50">Mark {status.replaceAll("_", " ")}</button>)}</div>
      </article>)}</div>}
  </section>;
}
