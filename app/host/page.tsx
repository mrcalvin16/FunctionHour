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
        "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (event.isSoldOut) {
    return {
      label: "Sold Out",
      classes:
        "border-red-200 bg-red-50 text-red-800",
    };
  }

  if (
    event.eventDate &&
    event.eventDate < Date.now()
  ) {
    return {
      label: "Ended",
      classes:
        "border-zinc-200 bg-zinc-100 text-zinc-700",
    };
  }

  return {
    label: "Live",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
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
    const now = Date.now();
    return [...(events ?? [])].sort((a, b) => {
      const aTime = a.eventDate ?? a.createdAt ?? 0;
      const bTime = b.eventDate ?? b.createdAt ?? 0;
      const aUpcoming = !a.eventDate || a.eventDate >= now;
      const bUpcoming = !b.eventDate || b.eventDate >= now;
      if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
      return aUpcoming ? aTime - bTime : bTime - aTime;
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

  const nextEvent = hostedEvents.find(
    (event) => !event.eventDate || event.eventDate >= Date.now()
  );

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
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 text-zinc-950 sm:px-7 sm:py-8">
      <section className="relative overflow-hidden rounded-[30px] border border-[#eadff9] bg-[#fffaf4] p-5 shadow-[0_18px_50px_rgba(42,24,68,.08)] sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-36 h-80 w-80 rounded-full border-[48px] border-orange-100/75" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-9rem] left-[38%] h-64 w-64 rounded-full bg-violet-100/55 blur-3xl" />
        <div className="relative grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.82fr)] lg:gap-9">
          <div className="flex flex-col justify-center py-2">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-violet-800">
              <span className="h-2 w-2 rounded-full bg-orange-500" /> Organizer OS
            </p>
            <h2 className="mt-5 max-w-xl text-3xl font-black leading-[1.06] tracking-[-0.05em] text-[#24143e] sm:text-5xl">
              Make every event <span className="text-violet-700">count.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-700 sm:text-base">
              Your lineup, guests, and next steps in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/host/create" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5422a5] px-5 text-sm font-black text-white organizer-os-solid-action hover:bg-[#42177f]">+ Create event</Link>
              <Link href="/host/events" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-white px-5 text-sm font-bold text-violet-900 hover:bg-violet-50">Manage events →</Link>
            </div>
            {notifications && notifications.length > 0 ? (
              <a href="#overview-attention" className="mt-5 w-fit text-xs font-bold text-orange-800 underline decoration-orange-300 underline-offset-4 hover:text-orange-900">
                {notifications.length} item{notifications.length === 1 ? "" : "s"} need your attention ↓
              </a>
            ) : null}
          </div>
          <div className="organizer-overview-spotlight relative isolate flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[24px] bg-[#24143e] p-5 text-white sm:p-6">
            {nextEvent?.imageUrl ? <img src={nextEvent.imageUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" /> : null}
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-br from-[#24143e]/95 via-[#341c5b]/90 to-[#b44d2d]/75" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border-[22px] border-white/15" />
            <p className="relative text-[11px] font-black uppercase tracking-[0.2em] text-orange-200">{nextEvent ? "Coming up next" : "Your next chapter"}</p>
            <div className="relative mt-8">
              <h3 className="line-clamp-2 text-2xl font-black tracking-[-0.035em] sm:text-3xl">{nextEvent?.name ?? "Your next great event starts here."}</h3>
              <p className="mt-2 text-sm text-violet-100">{nextEvent ? formatEventDate(nextEvent) : "Create an event and your next date will appear here."}</p>
              <Link href={nextEvent ? `/host/events/${nextEvent._id}` : "/host/create"} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-white/40 bg-[#513577] px-4 text-sm font-bold text-white hover:bg-[#664395]">
                {nextEvent ? "Open event →" : "Start an event →"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Organizer metrics" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1.2fr_1fr_1fr]">
        <MetricCard label="Gross ticket sales" value={money(stats.grossSales)} detail="Across your events" accent="violet" />
        <MetricCard label="Tickets sold" value={String(stats.ticketsSold)} detail={`${stats.sellThrough}% of listed capacity`} accent="orange" />
        <MetricCard label="Upcoming attendees" value={String(stats.upcomingAttendees)} detail="Tickets for upcoming events" accent="blue" />
      </section>

      <section aria-label="More performance" className="grid gap-3 rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_8px_30px_rgba(38,25,65,.04)] sm:grid-cols-3 sm:divide-x sm:divide-zinc-100">
        <SmallMetric label="Last 7 days" value={weeklySales === undefined ? "—" : `${weeklySales.currentTickets} tickets`} detail={weeklySales === undefined ? "Loading sales" : weeklySales.changePercent === 0 ? "Flat vs. prior week" : `${Math.abs(weeklySales.changePercent)}% ${weeklySales.changePercent > 0 ? "above" : "below"} prior week`} />
        <SmallMetric label="Event rating" value={ratingSummary && ratingSummary.ratingCount > 0 ? `${ratingSummary.averageRating.toFixed(1)} / 5` : "—"} detail={ratingSummary === undefined ? "Loading feedback" : `${ratingSummary.ratingCount} verified rating${ratingSummary.ratingCount === 1 ? "" : "s"}`} />
        <SmallMetric label="Active boosts" value={String(activeBoosts)} detail="Currently promoted events" />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.85fr)]">
        <section className="min-w-0 rounded-[26px] border border-zinc-200 bg-white p-5 shadow-[0_12px_40px_rgba(38,25,65,.05)] sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.17em] text-violet-700">Your lineup</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Your events</h2>
              <p className="mt-1 text-sm text-zinc-600">Jump into the events you are running.</p>
            </div>
            <Link href="/host/events" className="inline-flex min-h-11 items-center rounded-xl border border-zinc-200 px-4 text-sm font-bold text-violet-800 hover:bg-violet-50">See all events →</Link>
          </div>
          {events === undefined ? <EventsLoading /> : displayedEvents.length === 0 ? <EmptyEvents /> : (
            <div className="mt-5 divide-y divide-zinc-100 border-t border-zinc-100">
              {displayedEvents.map((event) => <EventCard key={event._id} event={event} />)}
            </div>
          )}
          {hostedEvents.length > 4 ? <p className="mt-4 text-xs text-zinc-600">Showing 4 of {hostedEvents.length} events</p> : null}
        </section>
        <div id="overview-attention" className="min-w-0 scroll-mt-24"><NotificationCenter notifications={notifications} /></div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,.85fr)]">
        <RecentActivity items={recentActivity} />
        <QuickActions />
      </div>
    </main>
  );
}

function MetricCard({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: "violet" | "orange" | "blue" }) {
  const colors = { violet: "bg-violet-700", orange: "bg-orange-500", blue: "bg-blue-600" };
  return (
    <article className={`relative overflow-hidden rounded-[24px] border p-5 shadow-[0_10px_32px_rgba(38,25,65,.05)] sm:p-6 ${accent === "violet" ? "border-violet-200 bg-[#f3edff]" : "border-zinc-200 bg-white"}`}>
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${colors[accent]}`} />
      <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full border-[17px] border-violet-200/40" />
      <p className="relative text-xs font-bold text-zinc-700">{label}</p>
      <p className="relative mt-3 break-words text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">{value}</p>
      <p className="relative mt-2 text-xs text-zinc-700">{detail}</p>
    </article>
  );
}

function SmallMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-2xl px-4 py-3">
      <p className="text-xs font-bold text-zinc-600">{label}</p>
      <p className="mt-1 text-lg font-black text-zinc-950">{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{detail}</p>
    </div>
  );
}

function EventCard({ event }: { event: HostedEvent }) {
  const sold = event.ticketsSold ?? 0;
  const capacity = event.totalTickets ?? 0;
  const soldPercent = percentage(sold, capacity);
  const status = eventStatus(event);
  return (
    <article className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-800 to-orange-500 sm:h-24 sm:w-24">
        {event.imageUrl ? <img src={event.imageUrl} alt="" className="h-full w-full object-cover" /> :
          <div className="flex h-full items-center justify-center text-3xl font-black text-white">{initials(event.name)}</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${status.classes}`}>{status.label}</span>
          {event.isPromoted ? <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-800">Promoted</span> : null}
        </div>
        <h3 className="mt-2 truncate text-lg font-black text-zinc-950">{event.name ?? "Untitled event"}</h3>
        <p className="mt-1 truncate text-xs text-zinc-600">{formatEventDate(event)}{event.location ? ` · ${event.location}` : ""}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-violet-600" style={{ width: `${soldPercent}%` }} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-zinc-700">{sold}{capacity > 0 ? ` / ${capacity}` : ""} sold</span>
        </div>
      </div>
      <Link href={`/host/events/${event._id}`} aria-label={`Open command center for ${event.name ?? "event"}`} className="organizer-os-solid-action inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-violet-700 px-4 text-xs font-bold text-white hover:bg-violet-800">
        Manage →
      </Link>
    </article>
  );
}

function EventsLoading() {
  return <div className="mt-5 space-y-3">{[1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />)}</div>;
}

function EmptyEvents() {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl font-black text-violet-700">+</div>
      <h3 className="mt-4 text-lg font-black text-zinc-950">Create your first event</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-700">Once your event is live, tickets and activity will appear here.</p>
      <Link href="/host/create" className="organizer-os-solid-action mt-5 inline-flex min-h-11 items-center rounded-xl bg-violet-700 px-5 text-sm font-bold text-white hover:bg-violet-800">Create event</Link>
    </div>
  );
}
