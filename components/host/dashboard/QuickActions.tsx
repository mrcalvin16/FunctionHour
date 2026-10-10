import Link from "next/link";
import {
  BarChart3,
  Palette,
  Plus,
  ScanLine,
  TicketCheck,
  type LucideIcon,
} from "lucide-react";

type QuickAction = {
  label: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  accent: string;
};

const quickActions: QuickAction[] = [
  {
    label: "Create Event",
    description: "Launch something new",
    href: "/host/create",
    icon: Plus,
    accent:
      "border-orange-200 bg-orange-50 text-orange-800",
  },
  {
    label: "Check In",
    description: "Open door operations",
    href: "/host/check-in",
    icon: ScanLine,
    accent:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    label: "Comp Tickets",
    description: "Issue guest access",
    href: "/host/comp-tickets",
    icon: TicketCheck,
    accent:
      "border-violet-200 bg-violet-50 text-violet-800",
  },
  {
    label: "Flyer Studio",
    description: "Create campaign assets",
    href: "/host/flyer-studio-v2",
    icon: Palette,
    accent:
      "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  },
  {
    label: "Analytics",
    description: "Review performance",
    href: "/host/analytics",
    icon: BarChart3,
    accent:
      "border-blue-200 bg-blue-50 text-blue-800",
  },
];

export default function QuickActions() {
  return (
    <section className="rounded-[1.6rem] border border-zinc-200 bg-white p-5 shadow-[0_16px_48px_rgba(40,25,70,.06)] sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
        Shortcuts
      </p>

      <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-950">
        Quick Actions
      </h2>

      <p className="mt-1 text-xs leading-5 text-zinc-600">
        Move directly into your most-used organizer tools.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${action.accent}`}
              >
                <Icon className="h-4 w-4" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-zinc-950">
                  {action.label}
                </span>

                <span className="mt-1 block truncate text-xs text-zinc-600">
                  {action.description}
                </span>
              </span>

              <span className="text-sm font-black text-violet-700 transition group-hover:translate-x-0.5 group-hover:text-violet-900">
                →
              </span>
            </>
          );

          if (!action.href) {
            return (
              <div
                key={action.label}
                aria-disabled="true"
                className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 opacity-60"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-zinc-200 bg-[#fbfaff] px-3.5 py-3 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:shadow-sm"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
