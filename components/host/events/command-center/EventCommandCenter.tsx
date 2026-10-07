"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  Gift,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  ScanLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
} from "react";
import type { Id } from "@/convex/_generated/dataModel";

export type EventCommandEvent = {
  _id: Id<"events">;
  name: string;
  description: string;
  category?: string;
  location: string;
  eventDate: number;
  dateString: string;
  price?: number;
  totalTickets?: number;
  maxTicketsPerOrder?: number;
  ticketsSold?: number;
  ratingTotal?: number;
  ratingCount?: number;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string | null;
  refundPolicy?: string;
  refundDeadline?: string;
  refundContactEmail?: string;
  dressCode?: string;
  ageRequirement?: string;
  parkingInfo?: string;
  entryNotes?: string;
  isPaused?: boolean;
  isSoldOut?: boolean;
  salesEndAt?: number;
  eventStatus?: "scheduled" | "postponed" | "cancelled";
};

type EventCommandContextValue = {
  event: EventCommandEvent;
  role: string;
  capabilities: readonly string[];
};

type CommandItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  exact?: boolean;
  soon?: boolean;
  requiredCapability?: string;
};

const EventCommandContext =
  createContext<EventCommandContextValue | null>(null);

export function useEventCommandCenter(): EventCommandContextValue {
  const value = useContext(EventCommandContext);

  if (!value) {
    throw new Error(
      "useEventCommandCenter must be used inside EventCommandCenter."
    );
  }

  return value;
}

export default function EventCommandCenter({
  event,
  role,
  capabilities,
  children,
}: EventCommandContextValue & {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const basePath = `/host/events/${event._id}`;
  const navigation: CommandItem[] = [
    {
      label: "Overview",
      href: basePath,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: "Tickets",
      href: `${basePath}/tickets`,
      icon: Ticket,
      requiredCapability: "manage_tickets",
    },
    {
      label: "Check In",
      href: `${basePath}/check-in`,
      icon: ScanLine,
      requiredCapability: "check_in",
    },
    {
      label: "Guest List",
      href: `${basePath}/guest-list`,
      icon: Users,
      requiredCapability: "view_reports",
    },
    {
      label: "Comp Tickets",
      href: `${basePath}/comp-tickets`,
      icon: Gift,
      requiredCapability: "issue_comp_tickets",
    },
    {
      label: "Team",
      href: `${basePath}/team`,
      icon: Users,
      requiredCapability: "manage_team",
    },
    {
      label: "Discounts",
      href: `${basePath}/discounts`,
      icon: Tag,
      requiredCapability: "manage_tickets",
    },
    {
      label: "Analytics",
      href: `${basePath}/analytics`,
      icon: BarChart3,
      requiredCapability: "view_reports",
    },
    {
      label: "AI Organizer",
      href: `${basePath}/ai`,
      icon: Sparkles,
      requiredCapability: "view_reports",
    },
    {
      label: "Flyers",
      href: `${basePath}/flyers`,
      icon: Sparkles,
      requiredCapability: "manage_marketing",
    },
    {
      label: "Messages",
      href: `${basePath}/messages`,
      icon: MessageSquare,
      requiredCapability: "manage_marketing",
    },
    {
      label: "Settings",
      href: `${basePath}/edit`,
      icon: Settings,
      requiredCapability: "manage_event",
    },
    {
      label: "Event changes",
      href: `${basePath}/changes`,
      icon: CalendarDays,
      requiredCapability: "manage_event",
    },
  ];
  const status = getEventStatus(event);

  return (
    <EventCommandContext.Provider
      value={{ event, role, capabilities }}
    >
      <div className="relative min-h-[calc(100vh-78px)] overflow-hidden">
        <section className="relative overflow-hidden border-b border-white/[0.08]">
          {event.imageUrl ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center opacity-15 blur-[2px]"
              style={{
                backgroundImage: `url("${event.imageUrl}")`,
              }}
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0914] via-[#0b0914]/95 to-[#17100d]/90" />
          <div className="absolute right-[-8%] top-[-80%] h-80 w-80 rounded-full bg-orange-500/15 blur-[100px]" />
          <div className="absolute left-[28%] top-[-90%] h-80 w-80 rounded-full bg-violet-600/15 blur-[110px]" />

          <div className="relative px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <Link
                  href="/host/events"
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 transition hover:text-white"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  All events
                </Link>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${status.classes}`}
                  >
                    {status.label}
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/15 bg-violet-400/[0.08] px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
                    <ShieldCheck className="h-3 w-3" />
                    {formatRole(role)}
                  </span>
                </div>

                <h1 className="mt-3 truncate text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                  {event.name}
                </h1>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-zinc-500">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-orange-400" />
                    {formatEventDate(event)}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-violet-400" />
                    {event.venueName || event.location}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/events/${event._id}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Public page
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                {capabilities.includes("check_in") ? (
                  <Link
                    href={`${basePath}/check-in`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-xs font-black shadow-[0_0_28px_rgba(124,58,237,0.25)] transition hover:scale-[1.01]"
                  >
                    <ScanLine className="h-4 w-4" />
                    Open check-in
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <nav className="sticky top-[78px] z-20 overflow-x-auto border-b border-white/[0.08] bg-[#090812]/92 px-3 backdrop-blur-2xl sm:px-5">
          <div className="flex min-w-max items-center gap-1 py-2">
            {navigation
              .filter(
                (item) =>
                  !item.requiredCapability ||
                  capabilities.includes(
                    item.requiredCapability
                  )
              )
              .map((item) => {
                const active =
                  Boolean(item.href) &&
                  (item.exact
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(
                        `${item.href}/`
                      ));
                const Icon = item.icon;
                const classes = [
                  "relative inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-xs font-black transition",
                  active
                    ? "bg-white/[0.09] text-white"
                    : item.soon
                      ? "cursor-default text-zinc-700"
                      : "text-zinc-500 hover:bg-white/[0.05] hover:text-white",
                ].join(" ");
                const content = (
                  <>
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {item.soon ? (
                      <span className="rounded-full border border-white/[0.07] px-1.5 py-0.5 text-[7px] uppercase tracking-wider text-zinc-700">
                        Soon
                      </span>
                    ) : null}
                    {active ? (
                      <span className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-orange-400" />
                    ) : null}
                  </>
                );

                return item.href && !item.soon ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={classes}
                  >
                    {content}
                  </Link>
                ) : (
                  <span
                    key={item.label}
                    className={classes}
                    aria-disabled="true"
                  >
                    {content}
                  </span>
                );
              })}
          </div>
        </nav>

        <div className="relative min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </EventCommandContext.Provider>
  );
}

function formatEventDate(event: EventCommandEvent): string {
  if (event.dateString) {
    return event.dateString;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.eventDate));
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function getEventStatus(event: EventCommandEvent): {
  label: string;
  classes: string;
} {
  if (event.isPaused) {
    return {
      label: "Sales paused",
      classes:
        "border-amber-400/20 bg-amber-400/10 text-amber-200",
    };
  }

  if (event.isSoldOut) {
    return {
      label: "Sold out",
      classes:
        "border-red-400/20 bg-red-400/10 text-red-200",
    };
  }

  if (event.eventDate < Date.now()) {
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
