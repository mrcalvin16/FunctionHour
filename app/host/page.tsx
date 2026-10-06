"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import NotificationCenter, {
  type DashboardNotification,
} from "@/components/host/dashboard/NotificationCenter";
import QuickActions from "@/components/host/dashboard/QuickActions";
import RecentActivity from "@/components/host/dashboard/RecentActivity";

type HostedEvent = {
  _id: Id<"events">;
  name?: string;
  description?: string;
  location?: string;
  imageUrl?: string | null;
  eventDate?: number;
  dateString?: string;
  price?: number;
  totalTickets?: number;
  ticketsSold?: number;
  isPaused?: boolean;
  isSoldOut?: boolean;
  createdAt?: number;
  isPromoted?: boolean;
  promotionTier?: string;
  promotionEndsAt?: number;
};

type OrganizerAnalytics = {
  grossSales?: number;
  ticketsSold?: number;
  upcomingEvents?: number;
};

type BoostOrder = {
  _id: string;
  amount?: number;
  status?: string;
  tier?: string;
  createdAt?: number;
};

function money(value?: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatEventDate(event: HostedEvent): string {
  if (event.dateString) {
    return event.dateString;
  }

  if (!event.eventDate) {
    return "Date pending";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.eventDate));
}

function percentage(
  sold = 0,
  capacity = 0
): number {
  if (capacity <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((sold / capacity) * 100)
  );
}

function eventStatus(event: HostedEvent): {
  label: string;
  classes: string;
} {
  if (event.isPaused) {
    return {
      label: "Paused",
      classes:
        "border-amber-400/20 bg-amber-400/10 text-amber-200",
    };
  }

  if (event.isSoldOut) {
    return {
      label: "Sold Out",
      classes:
        "border-red-400/20 bg-red-400/10 text-red-200",
    };
  }

  if (
    event.eventDate &&
    event.eventDate < Date.now()
  ) {
    return {
      label: "Ended",
      classes:
        "border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
    };
  }

  return {
    label: "Live",
    classes:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  };
}

function initials(name?: string): string {
  const value = name?.trim() || "Function Hour";

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function HostPage() {
  const { isSignedIn } = useUser();

  const events = useQuery(
    api.events.getMyEvents,
    isSignedIn ? {} : "skip"
  ) as HostedEvent[] | undefined;

  const analytics = useQuery(
    api.analytics.getOrganizerAnalytics,
    isSignedIn ? {} : "skip"
  ) as OrganizerAnalytics | undefined;

  const recentActivity = useQuery(
    api.analytics.getOrganizerRecentActivity,
    isSignedIn ? { limit: 10 } : "skip"
  );

  const weeklySales = useQuery(
    api.analytics.getOrganizerWeeklySales,
    isSignedIn ? {} : "skip"
  );

  const ratingSummary = useQuery(
    api.analytics.getOrganizerRatingSummary,
    isSignedIn ? {} : "skip"
  );

  const boostOrders = useQuery(
    api.events.getBoostOrdersForMyEvents,
    isSignedIn ? {} : "skip"
  ) as BoostOrder[] | undefined;

  const hostedEvents = useMemo(() => {
    return [...(events ?? [])].sort((a, b) => {
      const aTime =
        a.eventDate ?? a.createdAt ?? 0;

      const bTime =
        b.eventDate ?? b.createdAt ?? 0;

      return bTime - aTime;
    });
  }, [events]);

  const stats = useMemo(() => {
    const totalCapacity = hostedEvents.reduce(
      (sum, event) =>
        sum + (event.totalTickets ?? 0),
      0
    );

    const calculatedTicketsSold =
      hostedEvents.reduce(
        (sum, event) =>
          sum + (event.ticketsSold ?? 0),
        0
      );

    const calculatedRevenue =
      hostedEvents.reduce((sum, event) => {
        return (
          sum +
          (event.ticketsSold ?? 0) *
            (event.price ?? 0)
        );
      }, 0);

    const calculatedUpcoming =
      hostedEvents.filter((event) => {
        if (!event.eventDate) {
          return true;
        }

        return event.eventDate >= Date.now();
      }).length;

    const upcomingAttendees =
      hostedEvents
        .filter(
          (event) =>
            !event.eventDate ||
            event.eventDate >= Date.now()
        )
        .reduce(
          (sum, event) =>
            sum + (event.ticketsSold ?? 0),
          0
        );

    return {
      grossSales:
        analytics?.grossSales ??
        calculatedRevenue,

      ticketsSold:
        analytics?.ticketsSold ??
        calculatedTicketsSold,

      upcomingEvents:
        analytics?.upcomingEvents ??
        calculatedUpcoming,

      upcomingAttendees,

      totalCapacity,

      sellThrough: percentage(
        analytics?.ticketsSold ??
          calculatedTicketsSold,
        totalCapacity
      ),
    };
  }, [analytics, hostedEvents]);

  const activeBoosts = useMemo(() => {
    return (boostOrders ?? []).filter((order) =>
      ["active", "paid", "completed"].includes(
        order.status?.toLowerCase() ?? ""
      )
    ).length;
  }, [boostOrders]);

  const displayedEvents =
    hostedEvents.slice(0, 4);

  const notifications = useMemo<
    DashboardNotification[] | undefined
  >(() => {
    if (events === undefined) {
      return undefined;
    }

    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    const items: DashboardNotification[] = [];

    for (const event of hostedEvents) {
      const sold = event.ticketsSold ?? 0;
      const capacity = event.totalTickets ?? 0;
      const sellThrough = percentage(sold, capacity);

      if (event.isPaused) {
        items.push({
          id: `paused:${event._id}`,
          title: `${event.name ?? "Event"} sales are paused`,
          detail:
            "Resume ticket sales when you’re ready to accept new orders.",
          href: `/host/events/${event._id}/tickets`,
          severity: "warning",
        });
      }

      if (capacity <= 0) {
        items.push({
          id: `inventory:${event._id}`,
          title: `${event.name ?? "Event"} needs ticket inventory`,
          detail:
            "Add capacity and ticket tiers before promoting this event.",
          href: `/host/events/${event._id}/tickets`,
          severity: "urgent",
        });
      }

      if (
        event.eventDate &&
        event.eventDate >= now &&
        event.eventDate - now <= threeDays &&
        capacity > 0 &&
        sellThrough < 50
      ) {
        items.push({
          id: `sales:${event._id}`,
          title: `${event.name ?? "Event"} starts soon`,
          detail: `${sellThrough}% sold with less than three days remaining.`,
          href: "/host/boost",
          severity: "urgent",
        });
      }

      if (
        event.isPromoted &&
        event.promotionEndsAt &&
        event.promotionEndsAt >= now &&
        event.promotionEndsAt - now <= twoDays
      ) {
        items.push({
          id: `boost:${event._id}`,
          title: `${event.name ?? "Event"} boost ends soon`,
          detail:
            "Review performance before the promotion window closes.",
          href: "/host/boost",
          severity: "info",
        });
      }
    }

    const priority = {
      urgent: 0,
      warning: 1,
      info: 2,
      success: 3,
    } satisfies Record<
      DashboardNotification["severity"],
      number
    >;

    return items
      .sort(
        (a, b) =>
          priority[a.severity] -
          priority[b.severity]
      )
      .slice(0, 5);
  }, [events, hostedEvents]);

  if (isSignedIn === false) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-black">
            Sign in required
          </h1>

          <p className="mt-3 text-zinc-500">
            Sign in to access your organizer
            dashboard.
          </p>

          <Link
            href="/sign-in"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-black text-black"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto max-w-[1600px] space-y-6 px-4 py-6 text-zinc-950 sm:px-7 sm:py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-white p-6 shadow-[0_18px_60px_rgba(72,42,111,.09)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-violet-200/60 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 right-28 h-56 w-56 rounded-full bg-orange-100/80 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700">Function Hour · Organizer OS</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">Your events, at a glance.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-700">See what needs attention, check ticket activity, and get back to creating your next event.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/host/events" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-white px-5 text-sm font-bold text-violet-800 transition hover:bg-violet-50">Manage events</Link>
            <Link href="/host/create" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 text-sm font-black text-white shadow-[0_10px_28px_rgba(109,40,217,.22)] transition hover:brightness-110">+ Create event</Link>
          </div>
        </div>
      </section>

      <section aria-label="Organizer metrics" className="grid grid-cols-1 gap-4 min-[430px]:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Gross Sales"
          value={money(stats.grossSales)}
          description="Organizer revenue"
          signal={
            stats.grossSales > 0
              ? "Live sales total"
              : "Awaiting first sale"
          }
          signalTone={
            stats.grossSales > 0
              ? "positive"
              : "neutral"
          }
          graph="violet"
        />

        <MetricCard
          label="Tickets Sold"
          value={String(stats.ticketsSold)}
          description={`${stats.sellThrough}% sell-through`}
          signal={`Across ${hostedEvents.length} event${
            hostedEvents.length === 1 ? "" : "s"
          }`}
          graph="orange"
        />

        <MetricCard
          label="Upcoming Attendees"
          value={String(stats.upcomingAttendees)}
          description="Tickets for future events"
          signal={`${stats.upcomingEvents} event${
            stats.upcomingEvents === 1 ? "" : "s"
          } on deck`}
          graph="violet"
        />

        <MetricCard
          label="Weekly Sales"
          value={
            weeklySales === undefined
              ? "—"
              : String(weeklySales.currentTickets)
          }
          description="Tickets in the last 7 days"
          signal={
            weeklySales === undefined
              ? "Loading comparison"
              : weeklySales.changePercent > 0
                ? `${weeklySales.changePercent}% above prior week`
                : weeklySales.changePercent < 0
                  ? `${Math.abs(weeklySales.changePercent)}% below prior week`
                  : "Flat vs prior week"
          }
          signalTone={
            weeklySales === undefined ||
            weeklySales.changePercent === 0
              ? "neutral"
              : weeklySales.changePercent > 0
                ? "positive"
                : "warning"
          }
          graph="orange"
        />

        <MetricCard
          label="Event Rating"
          value={
            ratingSummary === undefined ||
            ratingSummary.ratingCount === 0
              ? "—"
              : `${ratingSummary.averageRating.toFixed(1)} ★`
          }
          description={
            ratingSummary === undefined
              ? "Loading verified ratings"
              : `${ratingSummary.ratingCount} verified rating${
                  ratingSummary.ratingCount === 1 ? "" : "s"
                }`
          }
          signal={
            ratingSummary === undefined
              ? "Loading attendee feedback"
              : ratingSummary.ratingCount === 0
                ? "Awaiting attendee ratings"
                : `Across ${ratingSummary.ratedEvents} event${
                    ratingSummary.ratedEvents === 1 ? "" : "s"
                  }`
          }
          signalTone={
            ratingSummary === undefined ||
            ratingSummary.ratingCount === 0
              ? "neutral"
              : ratingSummary.averageRating >= 4
                ? "positive"
                : ratingSummary.averageRating < 3
                  ? "warning"
                  : "neutral"
          }
          graph="violet"
        />

        <MetricCard
          label="Notifications"
          value={
            notifications === undefined
              ? "—"
              : String(notifications.length)
          }
          description="Operational action items"
          signal={
            notifications && notifications.length > 0
              ? "Review recommended"
              : "All clear"
          }
          signalTone={
            notifications && notifications.length > 0
              ? "warning"
              : "positive"
          }
          graph="orange"
        />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_16px_48px_rgba(40,25,70,.06)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                Active Events
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Your Events
              </h2>

              <p className="mt-1 text-sm text-zinc-600">
                Manage, monitor, and grow your
                events.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/host/events"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-black transition hover:bg-white/[0.07]"
              >
                View All Events →
              </Link>

              <Link
                href="/host/analytics"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 text-xs font-black shadow-[0_0_25px_rgba(124,58,237,0.25)] transition hover:scale-[1.02]"
              >
                Analytics →
              </Link>
            </div>
          </div>

          {events === undefined ? (
            <EventsLoading />
          ) : displayedEvents.length === 0 ? (
            <EmptyEvents />
          ) : (
            <div className="mt-5 space-y-4">
              {displayedEvents.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                />
              ))}
            </div>
          )}

          {hostedEvents.length > 4 && (
            <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
              <p className="text-xs text-zinc-600">
                Showing 4 of{" "}
                {hostedEvents.length} events
              </p>

              <Link
                href="/host/events"
                className="text-xs font-black text-violet-300 transition hover:text-white"
              >
                See all events →
              </Link>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[1.6rem] border border-violet-200 bg-gradient-to-br from-white via-[#faf7ff] to-[#fff8f2] p-5 shadow-[0_16px_48px_rgba(40,25,70,.07)] sm:p-6 2xl:sticky 2xl:top-[98px]">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
            Performance
          </p>

          <h2 className="mt-2 text-2xl font-black tracking-tight">
            Sales overview
          </h2>

          <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-5">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                  Ticket sell-through
                </p>

                <p className="mt-3 text-4xl font-black">
                  {stats.sellThrough}%
                </p>
              </div>

              <SignalOrb />
            </div>

            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-violet-500 to-fuchsia-500 transition-all"
                style={{
                  width: `${stats.sellThrough}%`,
                }}
              />
            </div>
          </div>

          <PulseCard
            label="Total ticket revenue"
            value={money(stats.grossSales)}
            description="Across your events"
            chart
          />

          <PulseCard
            label="Active Boosts"
            value={String(activeBoosts)}
            description="Promoted events"
            dots
          />

          <PulseCard
            label="Events created"
            value={String(hostedEvents.length)}
            description="In your organizer account"
            bars
          />

          <Link
            href="/host/analytics"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 text-sm font-black shadow-[0_0_30px_rgba(124,58,237,0.25)] transition hover:scale-[1.01]"
          >
            Open Analytics →
          </Link>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <RecentActivity items={recentActivity} />

        <div className="space-y-5">
          <NotificationCenter
            notifications={notifications}
          />
          <QuickActions />
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  signal,
  signalTone = "neutral",
  graph,
}: {
  label: string;
  value: string;
  description: string;
  signal: string;
  signalTone?: "positive" | "neutral" | "warning";
  graph: "violet" | "orange";
}) {
  return (
    <article className="relative min-h-[150px] overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white p-5 shadow-[0_10px_35px_rgba(40,25,70,.04)] transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-[0_18px_40px_rgba(85,45,135,.1)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-100/70 blur-2xl" />

      <p
        className={[
          "relative text-[9px] font-black uppercase tracking-[0.22em]",
          graph === "violet"
            ? "text-violet-400"
            : "text-orange-400",
        ].join(" ")}
      >
        {label}
      </p>

      <div className="relative mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 truncate text-xs text-zinc-600 sm:text-sm">
            {description}
          </p>
        </div>

        <MiniGraph variant={graph} />
      </div>

      <p
        className={[
          "relative mt-4 text-[10px] sm:text-xs",
          signalTone === "positive"
            ? "text-emerald-400"
            : signalTone === "warning"
              ? "text-amber-300"
              : "text-zinc-600",
        ].join(" ")}
      >
        {signalTone === "positive"
          ? "✓ "
          : signalTone === "warning"
            ? "! "
            : "— "}
        {signal}
      </p>
    </article>
  );
}

function EventCard({
  event,
}: {
  event: HostedEvent;
}) {
  const sold = event.ticketsSold ?? 0;
  const capacity = event.totalTickets ?? 0;
  const soldPercent = percentage(
    sold,
    capacity
  );
  const revenue =
    sold * (event.price ?? 0);
  const status = eventStatus(event);

  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-[#fcfbff] transition hover:border-violet-300 hover:shadow-[0_16px_32px_rgba(66,40,100,.08)]">
      <div className="grid min-h-[235px] md:grid-cols-[190px_minmax(0,1fr)]">
        <div className="organizer-event-cover relative min-h-[180px] overflow-hidden bg-gradient-to-br from-violet-950 via-violet-800 to-orange-700 md:min-h-full">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-black tracking-[-0.08em] text-white/90">
                  {initials(event.name)}
                </p>

                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.28em] text-white/50">
                  Function Hour
                </p>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />

          <div className="organizer-revenue-badge absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">
              Revenue
            </p>

            <p className="mt-1 break-words text-sm font-black text-zinc-950">
              {money(revenue)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${status.classes}`}
                >
                  {status.label}
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400">
                  {soldPercent}% sold
                </span>
              </div>

              <h3 className="mt-4 truncate text-xl font-black tracking-tight sm:text-2xl">
                {event.name ??
                  "Untitled Event"}
              </h3>

              <p className="mt-2 truncate text-xs text-zinc-600 sm:text-sm">
                {formatEventDate(event)}
                {event.location
                  ? ` • ${event.location}`
                  : ""}
              </p>
            </div>

            <Link
              href={`/host/events/${event._id}/edit`}
              aria-label={`Edit ${event.name ?? "event"}`}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            >
              Edit
            </Link>
          </div>

          {event.isPromoted && (
            <div className="mt-4">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200">
                Live Campaign
              </span>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <EventStat
              label="Sold"
              value={
                capacity > 0
                  ? `${sold} / ${capacity}`
                  : String(sold)
              }
            />

            <EventStat
              label="Revenue"
              value={money(revenue)}
            />

            <EventStat
              label="Price"
              value={
                (event.price ?? 0) > 0
                  ? money(event.price)
                  : "Free"
              }
            />
          </div>

          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>{sold} sold</span>

              <span>
                {capacity > 0
                  ? `${capacity} capacity`
                  : "Open capacity"}
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-violet-500"
                style={{
                  width: `${soldPercent}%`,
                }}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Link
                href={`/host/events/${event._id}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 text-xs font-black shadow-[0_0_25px_rgba(124,58,237,0.2)] transition hover:scale-[1.01] sm:w-auto sm:min-w-[170px]"
              >
                Open Command Center →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function EventStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">
        {label}
      </p>

      <p className="mt-2 truncate text-xs font-black sm:text-sm">
        {value}
      </p>
    </div>
  );
}

function PulseCard({
  label,
  value,
  description,
  valueClassName = "",
  chart = false,
  dots = false,
  bars = false,
}: {
  label: string;
  value: string;
  description: string;
  valueClassName?: string;
  chart?: boolean;
  dots?: boolean;
  bars?: boolean;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-violet-100 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.17em] text-zinc-600">
        {label}
      </p>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`truncate text-2xl font-black ${valueClassName}`}
          >
            {value}
          </p>

          <p className="mt-1 truncate text-xs text-zinc-600">
            {description}
          </p>
        </div>

        {chart && (
          <MiniGraph variant="violet" />
        )}

        {dots && (
          <div className="flex gap-3 pb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          </div>
        )}

        {bars && (
          <div className="flex items-end gap-1 pb-1">
            {[11, 18, 25, 34].map(
              (height) => (
                <span
                  key={height}
                  className="w-1.5 rounded-full bg-emerald-500"
                  style={{
                    height,
                    opacity:
                      0.35 + height / 60,
                  }}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SignalOrb() {
  return (
    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
      <span className="absolute h-24 w-24 rounded-full border border-orange-400/40" />

      <span className="absolute h-16 w-16 rounded-full border border-orange-400/30" />

      <span className="absolute h-10 w-10 rounded-full bg-orange-500/10 shadow-[0_0_40px_rgba(249,115,22,0.2)]" />

      <span className="h-3 w-3 animate-pulse rounded-full bg-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.9)]" />
    </div>
  );
}

function MiniGraph({
  variant,
}: {
  variant: "violet" | "orange";
}) {
  const stroke =
    variant === "violet"
      ? "#8b5cf6"
      : "#f97316";

  return (
    <svg
      width="88"
      height="35"
      viewBox="0 0 88 35"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M2 27C9 27 10 22 17 23C24 24 25 16 32 16C39 16 40 5 48 7C55 9 55 19 63 17C70 15 73 22 86 19"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EventsLoading() {
  return (
    <div className="mt-5 space-y-4">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-[235px] animate-pulse rounded-[1.35rem] border border-white/[0.06] bg-white/[0.025]"
        />
      ))}
    </div>
  );
}

function EmptyEvents() {
  return (
    <div className="mt-5 rounded-[1.35rem] border border-dashed border-white/10 bg-black/20 px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">
        +
      </div>

      <h3 className="mt-5 text-xl font-black">
        Create your first event
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Launch an event to begin tracking
        tickets, revenue, promotions, and
        attendees.
      </p>

      <Link
        href="/host/create"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 px-6 text-sm font-black shadow-[0_0_30px_rgba(124,58,237,0.25)]"
      >
        Create Event
      </Link>
    </div>
  );
}
