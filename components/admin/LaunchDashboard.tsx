"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Overview = {
  sessionEstimate: number; pageViews: number; activeSessions30m: number;
  registrations: number; organizers: number; supportRequests: number;
  negativeSignals: number; unresolvedNegative: number; urgent: number; limited: boolean;
  funnel: { browseClicks: number; signupClicks: number; createEventClicks: number; ticketClicks: number; checkoutOrders: number; createdEvents: number; publishedEvents: number; publishingOrganizers: number; organizerActivationRate: number | null };
  recentCreatedEvents: { id: string; name: string; city: string; state: string; createdAt: number }[];
  eventsByCity: { city: string; count: number }[];
  productFeedback: { id: string; message: string; status: string; createdAt: number }[];
  daily: { date: string; visits: number; signups: number }[];
  recentNegative: { id: string; category: string; message: string; priority: string; status: string; createdAt: number }[];
};
export default function LaunchDashboard() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/launch?days=${days}`, { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unavailable");
      setData(result); setError("");
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Unable to load dashboard");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [days]);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = window.setInterval(() => void refresh(controller.signal), 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [refresh]);
  const cards = data ? [
    ["Visitor sessions (estimate)", data.sessionEstimate],
    ["Page views", data.pageViews],
    ["Active in last 30 min", data.activeSessions30m],
    ["New registrations", data.registrations],
    ["New organizers", data.organizers],
    ["Support requests", data.supportRequests],
    ["Potential negative feedback", data.negativeSignals],
    ["Unresolved negative reports", data.unresolvedNegative],
  ] : [];
  return <div className="space-y-7 text-zinc-900">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-violet-700">Launch operations</p>
        <h1 className="mt-2 text-3xl font-bold">Launch watchtower</h1>
        <p className="mt-2 text-sm text-zinc-700">Visitor activity, new accounts and early warning signals. Auto-refreshes every minute.</p></div>
      <div className="flex items-center gap-2"><label htmlFor="launch-range" className="text-sm font-semibold">Period</label>
        <select id="launch-range" className="rounded-lg border p-2" value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={1}>24 hours</option><option value={7}>7 days</option><option value={30}>30 days</option>
        </select><button onClick={() => void refresh()} className="rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white">Refresh</button></div>
    </div>
    {loading && !data && <p>Loading launch metrics…</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {data && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([name,value]) => <div key={name} className="rounded-2xl border bg-white p-5"><p className="text-sm font-semibold text-zinc-600">{name}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}
    </div>
    {data.urgent > 0 && <div role="status" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-800">
      {data.urgent} urgent unresolved support {data.urgent === 1 ? "case" : "cases"} need attention. <Link href="/admin/support" className="underline">Review cases</Link>
    </div>}
    {data.limited && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">High traffic: some totals are capped by reporting limits.</p>}
    <p className="text-sm text-zinc-600">Visitor sessions are approximate, not unique people. Counts only include consented tracked sessions and begin after deployment. The 30-minute figure is recent activity, not a live concurrent-user count. Complaint categories are warning signals, not automated sentiment analysis.</p>
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">Conversion signals</h2>
      <p className="mt-1 text-sm text-zinc-600">Period totals: clicks and completed purchases are different measurements, not a single deduplicated user funnel.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([["Browse clicks", data.funnel.browseClicks], ["Signup clicks", data.funnel.signupClicks], ["Ticket intent clicks", data.funnel.ticketClicks], ["Paid orders", data.funnel.checkoutOrders]] as const).map(([label, value]) =>
          <div key={label} className="rounded-xl bg-zinc-50 p-4"><p className="text-sm text-zinc-600">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">Organizer activation</h2>
      <p className="mt-1 text-sm text-zinc-600">New real event records created in the selected window, excluding demos. Creation does not necessarily mean the event is published.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {([["Create-event clicks", data.funnel.createEventClicks], ["New events created", data.funnel.createdEvents], ["Event creators", data.funnel.publishingOrganizers]] as const).map(([label, value]) =>
          <div key={label} className="rounded-xl bg-zinc-50 p-4"><p className="text-sm text-zinc-600">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">Recently created events</h2>
      <p className="mt-1 text-sm text-zinc-600">Real event creations during the selected period. This is not a publication or sales count.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Event</th><th>City</th><th>Created (UTC)</th></tr></thead>
      <tbody>{data.recentCreatedEvents.map(event => <tr key={event.id} className="border-t"><td className="py-3 font-medium">{event.name}</td><td>{[event.city,event.state].filter(Boolean).join(", ") || "Unspecified"}</td><td>{new Date(event.createdAt).toLocaleString()}</td></tr>)}</tbody></table>
      {!data.recentCreatedEvents.length && <p className="py-4 text-zinc-600">No new real events created in this period.</p>}</div>
      <h3 className="mt-6 font-semibold">Event creations by city</h3>
      <div className="mt-2 flex flex-wrap gap-2">{data.eventsByCity.map(item => <span key={item.city} className="rounded-full bg-zinc-100 px-3 py-2 text-sm">{item.city}: {item.count}</span>)}</div>
    </section>
    <section className="rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold">Product feedback</h2><Link href="/feedback" className="font-semibold text-violet-700">Open feedback form →</Link></div>
      <p className="mt-1 text-sm text-zinc-600">Customer ideas, positive feedback, and concerns submitted through the dedicated form. Manage replies in the support inbox.</p>
      <div className="mt-4 divide-y">{data.productFeedback.map(item =>
        <div key={item.id} className="py-3"><p className="text-sm text-zinc-700">{item.message.replace("[Product Feedback]", "").trim()}</p><p className="mt-1 text-xs text-zinc-500">{item.status} · {new Date(item.createdAt).toLocaleString()}</p></div>)}
        {!data.productFeedback.length && <p className="py-4 text-zinc-600">No submitted feedback for this period.</p>}
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-bold">Daily trend</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Date (UTC)</th><th>Visitor sessions</th><th>Registrations</th></tr></thead>
        <tbody>{data.daily.map(day => <tr key={day.date} className="border-t"><td className="py-2">{day.date}</td><td>{day.visits}</td><td>{day.signups}</td></tr>)}</tbody></table></div>
    </section>
    <section className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3">
      <div><h2 className="text-xl font-bold">Potential negative feedback</h2><p className="mt-1 text-sm text-zinc-600">Refunds, payments, ticket problems, event reports and urgent requests submitted through Chev.</p></div>
      <Link className="font-semibold text-violet-700" href="/admin/support">Support inbox →</Link></div>
      <div className="mt-4 divide-y">{data.recentNegative.map(item => <div key={item.id} className="py-3"><p className="font-semibold capitalize">{item.category.replaceAll("_", " ")} · {item.status} {item.priority === "urgent" ? "· Urgent" : ""}</p><p className="mt-1 text-sm text-zinc-700">{item.message}</p><p className="mt-1 text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p></div>)}
        {!data.recentNegative.length && <p className="py-4 text-zinc-600">No potential negative feedback recorded during this period.</p>}</div>
    </section></>}
  </div>;
}
