"use client";

import { useState, type ComponentType } from "react";
import { useQuery } from "convex/react";
import {
  CircleAlert,
  DollarSign,
  Eye,
  ScanLine,
  Ticket,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import AnalyticsTrendChart, {
  type AnalyticsRange,
} from "@/components/host/analytics/AnalyticsTrendChart";
import ConversionFunnel from "@/components/host/analytics/ConversionFunnel";
import TrafficSources from "@/components/host/analytics/TrafficSources";
import RecentEventSales from "./RecentEventSales";
import TicketTypePerformance from "./TicketTypePerformance";
import GateThroughput from "./GateThroughput";
import PaymentReconciliation from "./PaymentReconciliation";
import PostEventWorkspace from "./PostEventWorkspace";
import { useEventCommandCenter } from "./EventCommandCenter";

export default function EventAnalyticsWorkspace() {
  const { event, capabilities } = useEventCommandCenter();
  const [rangeDays, setRangeDays] =
    useState<AnalyticsRange>(14);
  const canViewReports = capabilities.includes(
    "view_reports"
  );
  const analytics = useQuery(
    api.analytics.getEventAnalyticsWorkspace,
    canViewReports
      ? { eventId: event._id, days: rangeDays }
      : "skip"
  );

  if (!canViewReports) {
    return (
      <section className="mx-auto max-w-2xl rounded-[1.75rem] border border-white/[0.08] bg-[#0c0b14]/90 p-7 text-center">
        <CircleAlert className="mx-auto h-8 w-8 text-orange-300" />
        <h2 className="mt-4 text-xl font-black">
          Analytics access required
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Ask an event owner or admin for report access to view this workspace.
        </p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">
            Event intelligence
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Performance analytics
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Revenue, demand, acquisition, and gate performance for {event.name}.
          </p>
        </div>

        {analytics ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
              Lifetime sell-through
            </p>
            <p className="mt-1 text-lg font-black text-white">
              {analytics.capacity.sellThrough}%
              <span className="ml-2 text-xs text-zinc-600">
                {analytics.capacity.sold.toLocaleString()} /{" "}
                {analytics.capacity.total > 0
                  ? analytics.capacity.total.toLocaleString()
                  : "—"}
              </span>
            </p>
          </div>
        ) : (
          <div className="h-[66px] w-52 animate-pulse rounded-2xl bg-white/[0.04]" />
        )}
      </div>

      {analytics?.isLimited ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] px-4 py-3 text-xs leading-5 text-amber-100/80">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          This high-volume range reached the reporting limit. Shorten the range for the most precise daily breakdown.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric
          label="Revenue"
          value={
            analytics
              ? formatMoney(analytics.totals.revenue)
              : undefined
          }
          detail={`Last ${rangeDays} days`}
          icon={DollarSign}
          tone="violet"
        />
        <AnalyticsMetric
          label="Tickets sold"
          value={analytics?.totals.tickets.toLocaleString()}
          detail={
            analytics
              ? `${analytics.totals.buyers.toLocaleString()} unique buyers`
              : `Last ${rangeDays} days`
          }
          icon={Ticket}
          tone="orange"
        />
        <AnalyticsMetric
          label="Check-ins"
          value={analytics?.totals.checkIns.toLocaleString()}
          detail={`Last ${rangeDays} days`}
          icon={ScanLine}
          tone="emerald"
        />
        <AnalyticsMetric
          label="Event views"
          value={analytics?.totals.pageViews.toLocaleString()}
          detail={
            analytics
              ? `${analytics.funnel.purchaseRate}% view-to-buyer`
              : `Last ${rangeDays} days`
          }
          icon={Eye}
          tone="blue"
        />
      </section>

      <PostEventWorkspace />

      <AnalyticsTrendChart
        data={analytics?.series}
        days={rangeDays}
        onDaysChange={setRangeDays}
      />

      {analytics ? (
        <>
          <section className="grid gap-5 lg:grid-cols-2">
            <ConversionFunnel funnel={analytics.funnel} />
            <TrafficSources
              sources={analytics.trafficSources}
              periodDays={analytics.trafficWindowDays}
            />
          </section>

          <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <TicketTypePerformance
              items={analytics.ticketTypePerformance}
            />
            <RecentEventSales sales={analytics.recentSales} />
          </section>

          <GateThroughput items={analytics.gateThroughput} />

          <PaymentReconciliation
            reconciliation={analytics.reconciliation}
            periodDays={analytics.days}
          />
        </>
      ) : (
        <section className="grid animate-pulse gap-5 lg:grid-cols-2">
          <div className="h-[430px] rounded-[1.75rem] bg-white/[0.035]" />
          <div className="h-[430px] rounded-[1.75rem] bg-white/[0.035]" />
        </section>
      )}
    </div>
  );
}

type AnalyticsTone =
  | "violet"
  | "orange"
  | "emerald"
  | "blue";

const toneClasses: Record<
  AnalyticsTone,
  { icon: string; glow: string }
> = {
  violet: {
    icon: "border-violet-400/15 bg-violet-400/[0.09] text-violet-200",
    glow: "bg-violet-500/10",
  },
  orange: {
    icon: "border-orange-400/15 bg-orange-400/[0.09] text-orange-200",
    glow: "bg-orange-500/10",
  },
  emerald: {
    icon: "border-emerald-400/15 bg-emerald-400/[0.09] text-emerald-200",
    glow: "bg-emerald-500/10",
  },
  blue: {
    icon: "border-blue-400/15 bg-blue-400/[0.09] text-blue-200",
    glow: "bg-blue-500/10",
  },
};

function AnalyticsMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value?: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: AnalyticsTone;
}) {
  const classes = toneClasses[tone];

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
      <div
        aria-hidden="true"
        className={`absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl ${classes.glow}`}
      />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
            {label}
          </p>
          {value === undefined ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-white/[0.05]" />
          ) : (
            <p className="mt-2 text-2xl font-black tabular-nums text-white">
              {value}
            </p>
          )}
          <p className="mt-2 text-[10px] font-bold text-zinc-600">
            {detail}
          </p>
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${classes.icon}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </article>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 100 ? 2 : 0,
  }).format(value);
}
