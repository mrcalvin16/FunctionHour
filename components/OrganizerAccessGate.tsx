"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseEventId } from "@/lib/eventStaff";

export default function OrganizerAccessGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, userId } = useAuth();
  // A single identity-scoped query determines organizer eligibility, instead
  // of waiting for the full user profile and all owned event records.
  const organizerAccess = useQuery(
    api.users.getOrganizerAccess,
    isLoaded && isSignedIn && userId ? {} : "skip",
  );
  const eventPath = pathname.match(/^\/host\/events\/([^/]+)/);
  const staffEventId = parseEventId(eventPath?.[1]);
  const staffAccess = useQuery(
    api.eventAccess.getMyEventAccess,
    isLoaded && isSignedIn && userId && staffEventId ? { eventId: staffEventId } : "skip",
  );
  const accessLoading = Boolean(
    isLoaded && isSignedIn && userId &&
    (organizerAccess === undefined || (staffEventId && staffAccess === undefined))
  );
  const [slowAccess, setSlowAccess] = useState(false);

  useEffect(() => {
    setSlowAccess(false);
    if (!accessLoading) return;
    const timer = window.setTimeout(() => setSlowAccess(true), 12000);
    return () => window.clearTimeout(timer);
  }, [accessLoading, userId, pathname]);

  if (!isLoaded || accessLoading) {
    return slowAccess ? (
      <AccessScreen
        title="Organizer OS is taking longer than expected"
        description="Your account is still connecting. You can retry safely; no event or ticket information has been changed."
        action="Retry loading"
        onRetry={() => window.location.reload()}
        secondaryHref="/events"
        secondaryAction="Browse Events"
      />
    ) : <AccessScreen title="Loading Organizer OS…" />;
  }

  if (!isSignedIn || !userId) {
    return (
      <AccessScreen
        title="Organizer sign-in required"
        description="Sign in with an organizer or event-staff account to continue."
        href="/sign-in"
        action="Sign in"
      />
    );
  }

  // Signed-in attendees need this route to create their organizer identity.
  if (pathname === "/host/profile") return children;

  const canAccessOrganizerTools = organizerAccess?.isOrganizer === true;
  const canAccessStaffWorkspace = Boolean(staffAccess?.role);

  // Event staff access is scoped to their event workspace, not all Organizer OS routes.
  if (!canAccessOrganizerTools && !canAccessStaffWorkspace) {
    return (
      <AccessScreen
        title="Set up your organizer profile"
        description="Create your organizer identity to publish events, sell tickets, and open Organizer OS."
        href="/host/profile"
        action="Start Hosting"
        secondaryHref="/events"
        secondaryAction="Browse Events"
      />
    );
  }

  return children;
}

function AccessScreen({
  title,
  description,
  href,
  action,
  onRetry,
  secondaryHref,
  secondaryAction,
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  onRetry?: () => void;
  secondaryHref?: string;
  secondaryAction?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">Function Hour</p>
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        {description ? <p className="mt-3 text-zinc-400">{description}</p> : null}
        {action && (href || onRetry) ? (
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {onRetry ? (
              <button type="button" onClick={onRetry} className="rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-6 py-3 font-bold">
                {action}
              </button>
            ) : (
              <Link href={href!} className="rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-6 py-3 font-bold">
                {action}
              </Link>
            )}
            {secondaryHref && secondaryAction ? (
              <Link href={secondaryHref} className="rounded-full border border-white/15 px-6 py-3 font-bold hover:bg-white/10">
                {secondaryAction}
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
