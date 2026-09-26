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
      "border-orange-400/20 bg-orange-400/10 text-orange-300",
  },
  {
    label: "Check In",
    description: "Open door operations",
    href: "/host/check-in",
    icon: ScanLine,
    accent:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
  {
    label: "Comp Tickets",
    description: "Issue guest access",
    href: "/host/comp-tickets",
    icon: TicketCheck,
    accent:
      "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  {
    label: "Flyer Studio",
    description: "Create campaign assets",
    href: "/host/flyer-studio-v2",
    icon: Palette,
    accent:
      "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300",
  },
  {
    label: "Analytics",
    description: "Review performance",
    href: "/host/analytics",
    icon: BarChart3,
    accent:
      "border-blue-400/20 bg-blue-400/10 text-blue-300",
  },
];

export default function QuickActions() {
  return (
    <section className="rounded-[1.5rem] border border-white/[0.08] bg-gradient-to-br from-[#171128] via-[#100e18] to-[#16100e] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
        Shortcuts
      </p>

      <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
        Quick Actions
      </h2>

      <p className="mt-1 text-xs leading-5 text-zinc-700">
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
                <span className="block truncate text-sm font-black text-zinc-900">
                  {action.label}
                </span>

                <span className="mt-1 block truncate text-[10px] text-zinc-700">
                  {action.description}
                </span>
              </span>

              <span className="text-sm font-black text-zinc-800 transition group-hover:translate-x-0.5 group-hover:text-violet-800">
                →
              </span>
            </>
          );

          if (!action.href) {
            return (
              <div
                key={action.label}
                aria-disabled="true"
                className="flex min-h-[68px] items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3 opacity-60"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex min-h-[68px] items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-3.5 py-3 transition hover:border-white/[0.14] hover:bg-white/[0.04]"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
