"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  CircleAlert,
  Clock3,
  Gift,
  MapPin,
  MessageSquareText,
  ScanLine,
  Settings,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { useEventCommandCenter } from "./EventCommandCenter";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((value / total) * 100));
}

function relativeEventTime(timestamp: number): string {
  const difference = timestamp - Date.now();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.ceil(Math.abs(difference) / day);

  if (Math.abs(difference) < day) {
    return difference >= 0 ? "Today" : "Ended today";
  }

  return difference >= 0
    ? `${days} days away`
    : `Ended ${days} days ago`;
}

export default function EventOverview() {
  const { event, capabilities } =
    useEventCommandCenter();
  const basePath = `/host/events/${event._id}`;
  const sold = Math.max(0, event.ticketsSold ?? 0);
  const capacity = Math.max(0, event.totalTickets ?? 0);
  const sellThrough = percent(sold, capacity);
  const estimatedRevenue = sold * (event.price ?? 0);
  const ratingCount = event.ratingCount ?? 0;
  const rating =
    ratingCount > 0
      ? (event.ratingTotal ?? 0) / ratingCount
      : 0;
  const readiness = [
    {
      label: "Event details",
      detail: "Name, description, and category",
      ready: Boolean(
        event.name && event.description && event.category
      ),
    },
    {
      label: "Schedule and venue",
      detail: "Date, location, and entry destination",
      ready: Boolean(
        event.eventDate &&
          (event.venueName || event.location)
      ),
    },
    {
      label: "Ticket inventory",
      detail: "Capacity and pricing are configured",
      ready: capacity > 0,
    },
    {
      label: "Event artwork",
      detail: "Public-facing event image",
      ready: Boolean(event.imageUrl),
    },
  ];
  const readyCount = readiness.filter(
    (item) => item.ready
  ).length;
  const readinessPercent = Math.round(
    (readyCount / readiness.length) * 100
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tickets sold"
          value={sold.toLocaleString()}
          detail={
            capacity > 0
              ? `${capacity.toLocaleString()} total capacity`
              : "Capacity not configured"
          }
          icon={Ticket}
          tone="violet"
        />

        <MetricCard
          label="Estimated revenue"
          value={money(estimatedRevenue)}
          detail={
            (event.price ?? 0) > 0
              ? `${money(event.price ?? 0)} base ticket`
              : "Free admission"
          }
          icon={ArrowUpRight}
          tone="orange"
        />

        <MetricCard
          label="Sell-through"
          value={`${sellThrough}%`}
          detail={`${Math.max(capacity - sold, 0).toLocaleString()} remaining`}
          icon={Users}
          tone="emerald"
          progress={sellThrough}
        />

        <MetricCard
          label="Guest rating"
          value={ratingCount > 0 ? rating.toFixed(1) : "New"}
          detail={
            ratingCount > 0
              ? `${ratingCount.toLocaleString()} verified ratings`
              : "Ratings open after check-in"
          }
          icon={Star}
          tone="amber"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
        <div className="rounded-[1.75rem] border border-white/[0.08] bg-[#0c0b14]/85 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.2)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.23em] text-orange-400">
                Event operations
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
                Command shortcuts
              </h2>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10px] font-black text-zinc-500">
              <Clock3 className="h-3.5 w-3.5 text-violet-300" />
              {relativeEventTime(event.eventDate)}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {capabilities.includes("check_in") ? (
              <QuickAction
                href={`${basePath}/check-in`}
                title="Open Check-In"
                detail="Scan tickets and manage gate entry"
                icon={ScanLine}
                accent="orange"
              />
            ) : null}

            {capabilities.includes("manage_event") ? (
              <QuickAction
                href={`${basePath}/changes`}
                title="Event changes"
                detail="Cancel, postpone, or update venue and notify buyers"
                icon={CircleAlert}
                accent="orange"
              />
            ) : null}

            {capabilities.includes("manage_tickets") ? (
              <QuickAction
                href={`${basePath}/tickets`}
                title="Manage Tickets"
                detail="Pricing, inventory, VIP, and add-ons"
                icon={Ticket}
                accent="violet"
              />
            ) : null}

            {capabilities.includes("issue_comp_tickets") ? (
              <QuickAction
                href={`${basePath}/comp-tickets`}
                title="Comp Tickets"
                detail="Issue and track complimentary entry"
                icon={Gift}
                accent="emerald"
              />
            ) : null}

            {capabilities.includes("view_reports") ? (
              <QuickAction
                href={`${basePath}/analytics`}
                title="Event Analytics"
                detail="Revenue, demand, traffic, and check-ins"
                icon={BarChart3}
                accent="violet"
              />
            ) : null}

            {capabilities.includes("manage_marketing") ? (
              <QuickAction
                href={`${basePath}/flyers`}
                title="Flyers"
                detail="Create and publish campaign assets"
                icon={Sparkles}
                accent="orange"
              />
            ) : null}

            {capabilities.includes("manage_marketing") ? (
              <QuickAction
                href={`${basePath}/messages`}
                title="Messages"
                detail="Publish updates and prepare campaigns"
                icon={MessageSquareText}
                accent="neutral"
              />
            ) : null}

            {capabilities.includes("manage_event") ? (
              <QuickAction
                href={`${basePath}/edit`}
                title="Event Settings"
                detail="Venue, policies, schedule, and details"
                icon={Settings}
                accent="neutral"
              />
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-4 sm:grid-cols-2">
            <EventDetail
              icon={MapPin}
              label="Venue"
              value={event.venueName || event.location}
            />
            <EventDetail
              icon={Clock3}
              label="Event timing"
              value={event.dateString}
            />
          </div>
        </div>

        <aside className="rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#171128] via-[#0f0d17] to-[#17100d] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.23em] text-violet-300">
                Launch readiness
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight">
                Event health
              </h2>
            </div>

            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-black/30">
              <span className="text-lg font-black text-white">
                {readinessPercent}%
              </span>
            </div>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400"
              style={{ width: `${readinessPercent}%` }}
            />
          </div>

          <div className="mt-6 space-y-3">
            {readiness.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3.5"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                    item.ready
                      ? "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300"
                      : "border-amber-400/15 bg-amber-400/[0.08] text-amber-300"
                  }`}
                >
                  {item.ready ? (
                    <BadgeCheck className="h-4 w-4" />
                  ) : (
                    <CircleAlert className="h-4 w-4" />
                  )}
                </span>

                <span className="min-w-0">
                  <span className="block text-xs font-black text-zinc-200">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-zinc-600">
                    {item.detail}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {readinessPercent < 100 &&
          capabilities.includes("manage_event") ? (
            <Link
              href={`${basePath}/edit`}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/[0.08] px-4 text-xs font-black text-orange-200 transition hover:bg-orange-400/15"
            >
              Complete event setup
            </Link>
          ) : readinessPercent === 100 ? (
            <p className="mt-5 text-center text-xs font-black text-emerald-300">
              ✓ Event setup is ready
            </p>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

type Tone = "violet" | "orange" | "emerald" | "amber";

const toneStyles: Record<
  Tone,
  { icon: string; value: string; bar: string }
> = {
  violet: {
    icon: "border-violet-400/15 bg-violet-400/[0.08] text-violet-300",
    value: "text-violet-100",
    bar: "bg-violet-400",
  },
  orange: {
    icon: "border-orange-400/15 bg-orange-400/[0.08] text-orange-300",
    value: "text-orange-100",
    bar: "bg-orange-400",
  },
  emerald: {
    icon: "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300",
    value: "text-emerald-100",
    bar: "bg-emerald-400",
  },
  amber: {
    icon: "border-amber-400/15 bg-amber-400/[0.08] text-amber-300",
    value: "text-amber-100",
    bar: "bg-amber-400",
  },
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Ticket;
  tone: Tone;
  progress?: number;
}) {
  const style = toneStyles[tone];

  return (
    <article className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/85 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
            {label}
          </p>
          <p
            className={`mt-3 truncate text-2xl font-black tracking-tight sm:text-3xl ${style.value}`}
          >
            {value}
          </p>
          <p className="mt-2 truncate text-xs text-zinc-600">
            {detail}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${style.icon}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      {progress !== undefined ? (
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full ${style.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </article>
  );
}

function QuickAction({
  href,
  title,
  detail,
  icon: Icon,
  accent,
}: {
  href: string;
  title: string;
  detail: string;
  icon: typeof Ticket;
  accent: "orange" | "violet" | "emerald" | "neutral";
}) {
  const classes = {
    orange:
      "border-orange-400/15 bg-orange-400/[0.05] text-orange-300",
    violet:
      "border-violet-400/15 bg-violet-400/[0.05] text-violet-300",
    emerald:
      "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300",
    neutral:
      "border-white/[0.08] bg-white/[0.03] text-zinc-400",
  }[accent];

  return (
    <Link
      href={href}
      className={`group flex min-h-[92px] items-center gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.07] ${classes}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-black/20">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">
          {title}
        </span>
        <span className="mt-1 block truncate text-[10px] text-zinc-600">
          {detail}
        </span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 opacity-40 transition group-hover:opacity-100" />
    </Link>
  );
}

function EventDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600">
          {label}
        </p>
        <p className="mt-1 truncate text-xs font-bold text-zinc-300">
          {value}
        </p>
      </div>
    </div>
  );
}
