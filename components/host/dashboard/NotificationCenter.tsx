import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CircleCheck,
  Info,
  type LucideIcon,
} from "lucide-react";

export type DashboardNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "urgent" | "warning" | "info" | "success";
};

type NotificationCenterProps = {
  notifications: DashboardNotification[] | undefined;
};

const severityStyles: Record<
  DashboardNotification["severity"],
  {
    icon: LucideIcon;
    classes: string;
  }
> = {
  urgent: {
    icon: AlertTriangle,
    classes:
      "border-red-200 bg-red-50 text-red-800",
  },
  warning: {
    icon: AlertTriangle,
    classes:
      "border-amber-200 bg-amber-50 text-amber-800",
  },
  info: {
    icon: Info,
    classes:
      "border-blue-200 bg-blue-50 text-blue-800",
  },
  success: {
    icon: CircleCheck,
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
};

export default function NotificationCenter({
  notifications,
}: NotificationCenterProps) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-zinc-200 bg-white shadow-[0_16px_48px_rgba(40,25,70,.06)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-700">
            Attention Queue
          </p>

          <h2 className="mt-2 text-xl font-black tracking-tight">
            Notifications
          </h2>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-800">
          <BellRing className="h-4 w-4" />
        </span>
      </div>

      {notifications === undefined ? (
        <div className="space-y-3 p-5">
          {[1, 2].map((item) => (
            <div
              key={item}
              className="h-[78px] animate-pulse rounded-2xl bg-zinc-100"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800">
            <CircleCheck className="h-5 w-5" />
          </span>

          <p className="mt-4 font-black text-zinc-950">
            You’re all clear
          </p>

          <p className="mt-2 text-sm text-zinc-600">
            No event-readiness issues need attention.
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {notifications.map((notification) => {
            const style = severityStyles[notification.severity];
            const Icon = style.icon;

            return (
              <Link
                key={notification.id}
                href={notification.href}
                className="group flex items-start gap-3 rounded-2xl border border-zinc-200 bg-[#fbfaff] p-3.5 transition hover:border-violet-300 hover:bg-violet-50"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${style.classes}`}
                >
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-black text-zinc-950">
                    {notification.title}
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-zinc-600">
                    {notification.detail}
                  </span>
                </span>

                <span className="pt-2 text-xs font-black text-violet-700 transition group-hover:translate-x-0.5 group-hover:text-violet-900">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
