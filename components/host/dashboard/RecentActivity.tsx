import Link from "next/link";
import {
  Rocket,
  ScanLine,
  ShoppingBag,
  TicketCheck,
  type LucideIcon,
} from "lucide-react";

export type DashboardActivityItem = {
  id: string;
  kind: "sale" | "check_in" | "comp" | "boost";
  title: string;
  detail: string;
  occurredAt: number;
  href: string;
};

type RecentActivityProps = {
  items: DashboardActivityItem[] | undefined;
};

const activityStyles: Record<
  DashboardActivityItem["kind"],
  {
    icon: LucideIcon;
    iconClasses: string;
    label: string;
  }
> = {
  sale: {
    icon: ShoppingBag,
    iconClasses:
      "border-violet-400/20 bg-violet-400/10 text-violet-300",
    label: "Sale",
  },
  check_in: {
    icon: ScanLine,
    iconClasses:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    label: "Check-in",
  },
  comp: {
    icon: TicketCheck,
    iconClasses:
      "border-orange-400/20 bg-orange-400/10 text-orange-300",
    label: "Comp ticket",
  },
  boost: {
    icon: Rocket,
    iconClasses:
      "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300",
    label: "Boost",
  },
};

function formatRelativeTime(timestamp: number): string {
  const elapsedSeconds = Math.round(
    (timestamp - Date.now()) / 1000
  );
  const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto",
  });

  if (Math.abs(elapsedSeconds) < 60) {
    return formatter.format(elapsedSeconds, "second");
  }

  const elapsedMinutes = Math.round(elapsedSeconds / 60);

  if (Math.abs(elapsedMinutes) < 60) {
    return formatter.format(elapsedMinutes, "minute");
  }

  const elapsedHours = Math.round(elapsedMinutes / 60);

  if (Math.abs(elapsedHours) < 24) {
    return formatter.format(elapsedHours, "hour");
  }

  const elapsedDays = Math.round(elapsedHours / 24);

  if (Math.abs(elapsedDays) < 7) {
    return formatter.format(elapsedDays, "day");
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export default function RecentActivity({
  items,
}: RecentActivityProps) {
  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/80 shadow-[0_30px_100px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">
            Live Operations
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
            Recent Activity
          </h2>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      {items === undefined ? (
        <ActivityLoading />
      ) : items.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-zinc-500">
            <ScanLine className="h-5 w-5" />
          </div>

          <p className="mt-4 font-black text-white">
            No activity yet
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
            Ticket sales, check-ins, comp tickets, and boosts for your events will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {items.map((item) => {
            const style = activityStyles[item.kind];
            const Icon = style.icon;

            return (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-start gap-4 px-5 py-4 transition hover:bg-white/[0.035]"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${style.iconClasses}`}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="truncate text-sm font-black text-white transition group-hover:text-orange-200">
                      {item.title}
                    </span>

                    <span className="shrink-0 text-[10px] font-bold text-zinc-600">
                      {formatRelativeTime(item.occurredAt)}
                    </span>
                  </span>

                  <span className="mt-1 block truncate text-xs text-zinc-500">
                    {item.detail}
                  </span>

                  <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.18em] text-zinc-700">
                    {style.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActivityLoading() {
  return (
    <div className="divide-y divide-white/[0.06]">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="flex animate-pulse items-center gap-4 px-5 py-4"
        >
          <span className="h-11 w-11 rounded-2xl bg-white/[0.05]" />

          <span className="flex-1">
            <span className="block h-3 w-2/3 rounded-full bg-white/[0.06]" />
            <span className="mt-3 block h-2 w-1/2 rounded-full bg-white/[0.04]" />
          </span>
        </div>
      ))}
    </div>
  );
}
