"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  BarChart3,
  CalendarDays,
  Download,
  Eye,
  TicketCheck,
  TrendingUp,
} from "lucide-react";
import { api } from "@/convex/_generated/api";

type ReportType = "sales" | "events" | "attendance" | "traffic";
type RangeDays = 7 | 14 | 30;

const reportOptions: Array<{
  id: ReportType;
  label: string;
  description: string;
  icon: typeof TrendingUp;
}> = [
  { id: "sales", label: "Sales", description: "Daily revenue and ticket volume", icon: TrendingUp },
  { id: "events", label: "Event Performance", description: "Revenue, sales, and views by event", icon: BarChart3 },
  { id: "attendance", label: "Attendance", description: "Check-in activity and arrival rate", icon: TicketCheck },
  { id: "traffic", label: "Traffic Sources", description: "How attendees discover your events", icon: Eye },
];

export default function ReportsWorkspace() {
  const [reportType, setReportType] = useState<ReportType>("sales");
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const analytics = useQuery(api.analytics.getOrganizerAnalytics, {});
  const trends = useQuery(api.analytics.getOrganizerTrendSeries, { days: rangeDays });

  const selectedReport = reportOptions.find((report) => report.id === reportType)!;
  const isLoading = analytics === undefined || trends === undefined;
  const maxTrendValue = useMemo(() => {
    const values = (trends?.series ?? []).map((day) =>
      reportType === "attendance" ? day.checkIns : day.revenue
    );
    return Math.max(1, ...values);
  }, [reportType, trends]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:text-black">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Operations intelligence</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Reports</h2>
          <p className="mt-2 text-sm text-zinc-500">Generate clear, exportable reports from live organizer data.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Link href="/host/exports" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-xs font-black hover:brightness-110 disabled:opacity-40"><Download className="h-4 w-4" /> Secure exports</Link>
        </div>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4 print:hidden">
        {reportOptions.map(({ id, label, description, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setReportType(id)} className={`rounded-2xl border p-4 text-left transition ${reportType === id ? "border-violet-400/40 bg-violet-500/10 shadow-[0_0_24px_rgba(139,92,246,0.12)]" : "border-white/[0.08] bg-white/[0.035] hover:bg-white/[0.06]"}`}>
            <div className="flex items-center justify-between"><Icon className={reportType === id ? "h-5 w-5 text-orange-400" : "h-5 w-5 text-zinc-600"} /><span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">{reportType === id ? "Selected" : "Report"}</span></div>
            <p className="mt-4 text-sm font-black">{label}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-600">{description}</p>
          </button>
        ))}
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] print:border-zinc-300 print:bg-white print:text-black">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between print:border-zinc-300">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400 print:text-zinc-600">Function Hour Organizer Report</p>
            <h3 className="mt-2 text-xl font-black">{selectedReport.label}</h3>
            <p className="mt-1 text-xs text-zinc-600">Generated {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(Date.now())}</p>
          </div>
          {reportType !== "events" && reportType !== "traffic" ? (
            <div className="flex gap-2 print:hidden">
              {([7, 14, 30] as RangeDays[]).map((days) => (
                <button key={days} type="button" onClick={() => setRangeDays(days)} className={`min-h-10 rounded-xl px-4 text-xs font-black ${rangeDays === days ? "bg-white text-black" : "border border-white/[0.08] text-zinc-500"}`}>{days} days</button>
              ))}
            </div>
          ) : null}
        </div>

        {isLoading ? <ReportLoading /> : (
          <div className="p-5">
            {reportType === "sales" ? <TrendReport series={trends.series} max={maxTrendValue} valueKey="revenue" /> : null}
            {reportType === "attendance" ? <TrendReport series={trends.series} max={maxTrendValue} valueKey="checkIns" /> : null}
            {reportType === "events" ? <EventReport events={analytics.salesByEvent} /> : null}
            {reportType === "traffic" ? <TrafficReport sources={analytics.trafficSources} /> : null}
          </div>
        )}
      </section>
    </div>
  );
}

function TrendReport({ series, max, valueKey }: { series: Array<{ date: string; label: string; revenue: number; tickets: number; checkIns: number }>; max: number; valueKey: "revenue" | "checkIns" }) {
  const totals = series.reduce((result, day) => ({ revenue: result.revenue + day.revenue, tickets: result.tickets + day.tickets, checkIns: result.checkIns + day.checkIns }), { revenue: 0, tickets: 0, checkIns: 0 });
  return <><div className="grid gap-3 sm:grid-cols-3"><ReportMetric label={valueKey === "revenue" ? "Revenue" : "Check-ins"} value={valueKey === "revenue" ? currency(totals.revenue) : totals.checkIns.toLocaleString()} /><ReportMetric label="Tickets sold" value={totals.tickets.toLocaleString()} /><ReportMetric label="Daily average" value={valueKey === "revenue" ? currency(totals.revenue / Math.max(1, series.length)) : (totals.checkIns / Math.max(1, series.length)).toFixed(1)} /></div><div className="mt-6 space-y-3">{series.map((day) => { const value = day[valueKey]; return <div key={day.date} className="grid grid-cols-[70px_minmax(0,1fr)_80px] items-center gap-3 text-xs"><span className="font-bold text-zinc-500 print:text-zinc-700">{day.label}</span><div className="h-2 overflow-hidden rounded-full bg-white/[0.06] print:bg-zinc-200"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-400" style={{ width: `${Math.max(value ? 2 : 0, (value / max) * 100)}%` }} /></div><span className="text-right font-black">{valueKey === "revenue" ? currency(value) : value}</span></div>; })}</div></>;
}

function EventReport({ events }: { events: Array<{ eventId: string; name: string; revenue: number; ticketsSold: number; pageViews: number }> }) {
  if (!events.length) return <EmptyReport />;
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[0.14em] text-zinc-600"><tr><th className="pb-4">Event</th><th className="pb-4 text-right">Revenue</th><th className="pb-4 text-right">Tickets</th><th className="pb-4 text-right">Views</th><th className="pb-4 text-right">Conversion</th></tr></thead><tbody className="divide-y divide-white/[0.06] print:divide-zinc-200">{events.map((event) => <tr key={event.eventId}><td className="py-4 font-black">{event.name}</td><td className="py-4 text-right font-bold text-orange-300 print:text-black">{currency(event.revenue)}</td><td className="py-4 text-right">{event.ticketsSold}</td><td className="py-4 text-right">{event.pageViews}</td><td className="py-4 text-right">{event.pageViews ? `${((event.ticketsSold / event.pageViews) * 100).toFixed(1)}%` : "—"}</td></tr>)}</tbody></table></div>;
}

function TrafficReport({ sources }: { sources: Array<{ key: string; label: string; value: number }> }) {
  const total = sources.reduce((sum, source) => sum + source.value, 0);
  if (!total) return <EmptyReport />;
  return <div className="space-y-4">{sources.slice().sort((a, b) => b.value - a.value).map((source) => <div key={source.key} className="grid grid-cols-[100px_minmax(0,1fr)_100px] items-center gap-3 text-xs"><span className="font-bold">{source.label}</span><div className="h-2 overflow-hidden rounded-full bg-white/[0.06] print:bg-zinc-200"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-violet-500" style={{ width: `${(source.value / total) * 100}%` }} /></div><span className="text-right font-black">{source.value} · {Math.round((source.value / total) * 100)}%</span></div>)}</div>;
}

function ReportMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/[0.07] bg-black/20 p-4 print:border-zinc-200 print:bg-zinc-50"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>; }
function ReportLoading() { return <div className="animate-pulse p-5"><div className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl bg-white/[0.05]" />)}</div><div className="mt-6 h-64 rounded-2xl bg-white/[0.04]" /></div>; }
function EmptyReport() { return <div className="py-16 text-center"><CalendarDays className="mx-auto h-8 w-8 text-zinc-700" /><p className="mt-4 text-sm font-black">No report data yet</p><p className="mt-1 text-xs text-zinc-600">Activity will appear after your events receive traffic or ticket sales.</p></div>; }
function currency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value); }
