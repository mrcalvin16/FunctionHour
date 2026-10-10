"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Case = {
  _id: string; category: string; email: string; name?: string; message: string;
  eventUrl?: string; pagePath: string; status: "new" | "in_progress" | "waiting_on_organizer" | "resolved";
  priority?: "standard" | "urgent"; assignedTo?: string; followUpAt?: number;
  lastReplyAt?: number; notificationStatus: "pending" | "delivered" | "failed";
  createdAt: number; updatedAt: number;
};
type Activity = { _id: string; actorId: string; action: string; detail: string; createdAt: number };
type Action = "claim" | "release" | "priority" | "status" | "note" | "follow_up" | "reply_recorded";

export default function SupportRequestQueue() {
  const [requests, setRequests] = useState<Case[]>([]);
  const [operatorId, setOperatorId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/support-requests", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load requests.");
      setRequests(result.requests); setOperatorId(result.operatorId || ""); setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load requests.");
    } finally { setLoading(false); }
  }, []);

  const loadCase = useCallback(async (id: string) => {
    setSelectedId(id); setActivity([]);
    try {
      const response = await fetch(`/api/admin/support-requests?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load case history.");
      setActivity(result.activity);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load case history."); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => requests.filter((item) => {
    if (filter === "open" && item.status === "resolved") return false;
    if (filter === "urgent" && item.priority !== "urgent") return false;
    if (filter === "overdue" && (!item.followUpAt || item.followUpAt >= Date.now() || item.status === "resolved")) return false;
    if (["new", "in_progress", "waiting_on_organizer", "resolved"].includes(filter) && item.status !== filter) return false;
    const text = `${item._id} ${item.email} ${item.name || ""} ${item.category} ${item.message}`.toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }).sort((a, b) => {
    const rank = (item: Case) => item.status === "resolved" ? 3 : item.followUpAt && item.followUpAt < Date.now() ? 0 : item.priority === "urgent" ? 1 : 2;
    return rank(a) - rank(b) || b.createdAt - a.createdAt;
  }), [requests, filter, search]);

  async function update(id: string, action: Action, fields: Partial<Pick<Case, "priority" | "status" | "followUpAt">> & { note?: string } = {}) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/support-requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...fields }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update case.");
      setNotice("Case updated."); setNote("");
      await refresh(); await loadCase(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update case.");
    } finally { setBusy(false); }
  }

  function setFollowUpDate(event: FormEvent<HTMLFormElement>, item: Case) {
    event.preventDefault();
    const value = new Date(followUp).getTime();
    if (!followUp || !Number.isFinite(value) || value < Date.now()) { setError("Choose a future follow-up time."); return; }
    void update(item._id, "follow_up", { followUpAt: value });
  }

  const selected = requests.find((item) => item._id === selectedId);
  const openCount = requests.filter((item) => item.status !== "resolved").length;
  const overdueCount = requests.filter((item) => item.status !== "resolved" && item.followUpAt && item.followUpAt < Date.now()).length;

  return <section className="mt-8 text-zinc-950">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Case workspace</h2><button type="button" onClick={() => void refresh()} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold">Refresh</button></div>
    <p className="mt-2 text-sm text-zinc-700">{openCount} open · {overdueCount} overdue follow-ups in the latest 100 requests. Replies go through operations@functionhour.com; recording one here does not send an email.</p>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <label className="flex-1 text-sm font-semibold">Search cases<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email, reference, category, message" className="mt-1 block min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4" /></label>
      <label className="text-sm font-semibold">View<select value={filter} onChange={(event) => setFilter(event.target.value)} className="mt-1 block min-h-11 rounded-xl border border-zinc-300 bg-white px-4"><option value="open">Open</option><option value="new">New</option><option value="in_progress">In progress</option><option value="waiting_on_organizer">Waiting on organizer</option><option value="urgent">Urgent</option><option value="overdue">Overdue follow-up</option><option value="resolved">Resolved</option><option value="all">All</option></select></label>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    {loading ? <p className="mt-4">Loading requests…</p> : filtered.length === 0 ? <p className="mt-4 rounded-xl border p-5 text-sm">No matching requests.</p> :
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)]"><div className="space-y-3">
        {filtered.map((item) => <button type="button" key={item._id} onClick={() => { setNote(""); setFollowUp(""); void loadCase(item._id); }}
          className={`block w-full rounded-2xl border bg-white p-4 text-left shadow-sm ${selectedId === item._id ? "border-violet-500 ring-2 ring-violet-100" : "border-zinc-200"}`}>
          <span className="flex flex-wrap justify-between gap-2"><strong className="capitalize">{item.category.replaceAll("_", " ")}</strong><span className="text-xs text-zinc-700">{new Date(item.createdAt).toLocaleString()}</span></span>
          <span className="mt-2 block truncate text-sm">{item.name || item.email} · {item.message}</span>
          <span className="mt-2 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-zinc-100 px-2 py-1">{item.status.replaceAll("_", " ")}</span>{item.priority === "urgent" && <span className="rounded-full bg-red-100 px-2 py-1 text-red-900">Urgent</span>}{item.followUpAt && item.status !== "resolved" && <span className={`rounded-full px-2 py-1 ${item.followUpAt < Date.now() ? "bg-amber-100 text-amber-950" : "bg-violet-100 text-violet-900"}`}>Follow up {new Date(item.followUpAt).toLocaleDateString()}</span>}</span>
        </button>)}
      </div><div>{selected && <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-bold capitalize">{selected.category.replaceAll("_", " ")} · {selected.name || "Visitor"}</h3>
        <p className="mt-1 break-all text-xs text-zinc-700">Reference {selected._id} · Alert {selected.notificationStatus} · {new Date(selected.createdAt).toLocaleString()}</p>
        <p className="mt-4 whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-6">{selected.message}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-700"><span>Page: {selected.pagePath}</span>{selected.eventUrl && <a className="font-semibold text-violet-800 underline" href={selected.eventUrl}>View event</a>}<a className="font-semibold text-violet-800 underline" href={`/admin/orders?q=${encodeURIComponent(selected.email)}`}>Look up orders</a></div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white" href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`Function Hour support request ${selected._id}`)}`}>Reply by email</a>
          <button type="button" disabled={busy} onClick={() => { if (window.confirm("Record that a reply was sent outside Function Hour? This will not send an email.")) void update(selected._id, "reply_recorded"); }} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50">Record reply sent</button>
          {!selected.assignedTo ? <button type="button" disabled={busy} onClick={() => void update(selected._id, "claim")} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50">Take case</button> : <span className="self-center text-xs text-zinc-700">Owner: {selected.assignedTo}</span>}
          {selected.assignedTo === operatorId && <button type="button" disabled={busy} onClick={() => void update(selected._id, "release")} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-bold disabled:opacity-50">Release case</button>}
        </div>
        {selected.lastReplyAt && <p className="mt-2 text-xs text-zinc-700">Last reply recorded {new Date(selected.lastReplyAt).toLocaleString()}</p>}
        <div className="mt-5 grid gap-3 border-t border-zinc-200 pt-5 sm:grid-cols-2">
          <label className="text-xs font-semibold">Priority<select value={selected.priority || "standard"} disabled={busy} onChange={(event) => void update(selected._id, "priority", { priority: event.target.value as Case["priority"] })} className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"><option value="standard">Standard</option><option value="urgent">Urgent</option></select></label>
          <label className="text-xs font-semibold">Status<select value={selected.status} disabled={busy} onChange={(event) => { const status = event.target.value as Case["status"]; if (status === "resolved") { setError("Add a resolution note below, then select Resolve."); return; } void update(selected._id, "status", { status }); }} className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"><option value="new">New</option><option value="in_progress">In review</option><option value="waiting_on_organizer">Waiting on organizer</option><option value="resolved">Resolved</option></select></label>
        </div>
        <form onSubmit={(event) => setFollowUpDate(event, selected)} className="mt-4 flex flex-wrap items-end gap-2"><label className="text-xs font-semibold">Follow up at<input type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)} className="mt-1 block min-h-10 rounded-lg border border-zinc-300 bg-white p-2 text-sm" /></label><button type="submit" disabled={busy} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold">Set reminder</button>{selected.followUpAt && <button type="button" disabled={busy} onClick={() => void update(selected._id, "follow_up")} className="rounded-lg border px-3 py-2 text-xs font-bold">Clear</button>}</form>
        <p className="mt-1 text-xs text-zinc-600">Follow-up is an admin queue reminder; it does not send a notification.</p>
        <label className="mt-5 block text-xs font-semibold">Internal note or resolution summary<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={3} className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm" placeholder="Visible only to Operations" /></label>
        <div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy || !note.trim()} onClick={() => void update(selected._id, "note", { note })} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-bold disabled:opacity-50">Save note</button>{selected.status !== "resolved" && <button type="button" disabled={busy || !note.trim()} onClick={() => void update(selected._id, "status", { status: "resolved", note })} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Resolve with note</button>}</div>
        <h4 className="mt-6 border-t border-zinc-200 pt-5 font-bold">Case activity</h4>
        {activity.length === 0 ? <p className="mt-2 text-xs text-zinc-700">No activity recorded yet.</p> : <ol className="mt-3 space-y-3">{activity.map((entry) => <li key={entry._id} className="border-l-2 border-violet-200 pl-3 text-xs"><span className="font-semibold capitalize">{entry.action.replaceAll("_", " ")}</span> · {new Date(entry.createdAt).toLocaleString()} · {entry.actorId}<p className="mt-1 whitespace-pre-wrap text-zinc-700">{entry.detail}</p></li>)}</ol>}
      </article>}</div></div>}
  </section>;
}
