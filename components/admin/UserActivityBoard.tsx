"use client";
import { useCallback, useEffect, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

type Activity = FunctionReturnType<typeof api.platformActivity.overview>;
const labels: Record<string, string> = { create_event: "Create Event", get_tickets: "Get Tickets", ticket_checkout: "Continue ticket checkout", merch_checkout: "Continue merch checkout", sign_in: "Sign In", sign_up: "Sign Up", browse_events: "Browse Events" };
const date = (value: number) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export default function UserActivityBoard() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/activity?days=${days}`, { cache: "no-store", signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load activity.");
      setData(body);
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : "Unable to load activity.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [days]);
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  return <div className="space-y-6 text-zinc-900">
    <div className="flex flex-wrap items-center gap-3"><label className="font-semibold" htmlFor="activity-range">Period</label><select id="activity-range" value={days} onChange={event => { setData(null); setDays(Number(event.target.value)); }} className="rounded-xl border border-zinc-300 bg-white px-4 py-2"><option value={1}>Last 24 hours</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select><button disabled={loading} onClick={() => void refresh()} className="rounded-xl bg-violet-700 px-4 py-2 font-semibold text-white disabled:opacity-60">{loading ? "Loading…" : "Refresh"}</button></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    {data && !error && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["New registrations", data.registrations], ["New organizers", data.organizers], ["Onboarding completed", data.onboardingCompleted], ["CTA clicks", Object.values(data.counts).reduce((a, b) => a + b, 0)]].map(([label, value]) => <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-5"><p className="text-sm font-semibold text-zinc-700">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div>
      {(data.usersLimited || data.clicksLimited) && <p className="rounded-xl bg-amber-50 p-4 text-amber-900">High activity: affected totals cover the latest 2,000 records in this period.</p>}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-xl font-bold">Recent registrations</h2><p className="mt-1 text-sm text-zinc-700">Latest 100 accounts recorded in Function Hour. Onboarding shows their current status.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["User", "Account", "Onboarding", "Registered"].map(label => <th key={label} className="border-b p-3 font-semibold">{label}</th>)}</tr></thead><tbody>{data.users.map(user => <tr key={user.id}><td className="border-b p-3"><p className="font-semibold">{user.name}</p><p className="text-zinc-700">{user.email}</p></td><td className="border-b p-3">{user.organizer ? "Organizer" : "Attendee"}</td><td className="border-b p-3">{user.onboarded ? "Completed" : "Not completed"}</td><td className="border-b p-3 whitespace-nowrap">{date(user.registeredAt)}</td></tr>)}</tbody></table>{!data.users.length && <p className="py-6 text-zinc-700">No registrations in this period.</p>}</div></section>
      <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-xl font-bold">CTA clicks</h2><p className="mt-1 text-sm text-zinc-700">Interactions, not completed purchases or registrations. Tracking begins after deployment and honors analytics opt-out.</p><ul className="mt-4 divide-y">{Object.entries(labels).map(([key, label]) => <li key={key} className="flex justify-between gap-4 py-3"><span>{label}</span><span className="font-bold">{data.counts[key] || 0}</span></li>)}</ul></section><section className="rounded-2xl border border-zinc-200 bg-white p-5"><h2 className="text-xl font-bold">Recent CTA activity</h2><ul className="mt-4 divide-y">{data.recentClicks.map(click => <li key={click.id} className="py-3"><p className="font-semibold">{labels[click.cta] || click.cta}</p><p className="text-sm text-zinc-700">{click.path} · {date(click.createdAt)}</p></li>)}</ul>{!data.recentClicks.length && <p className="py-6 text-zinc-700">No tracked clicks in this period.</p>}</section></div>
    </>}
  </div>;
}
