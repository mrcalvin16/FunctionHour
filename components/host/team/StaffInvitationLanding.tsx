"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { staffSignInUrl } from "@/lib/eventStaff";

export default function StaffInvitationLanding({ eventId }: { eventId: Id<"events"> }) {
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const event = useQuery(api.events.getById, { eventId });
  const access = useQuery(
    api.eventAccess.getMyEventAccess,
    isLoaded && isSignedIn && event ? { eventId } : "skip"
  );

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (isLoaded && !isSignedIn) {
      router.replace(staffSignInUrl(eventId));
      return;
    }
    if (access?.role) {
      router.replace(`/host/events/${eventId}`);
    }
  }, [access?.role, eventId, hasMounted, isLoaded, isSignedIn, router]);

  const email = hasMounted ? user?.primaryEmailAddress?.emailAddress : undefined;

  if (!hasMounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10 text-slate-950">
        <section aria-live="polite" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-900/5 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">FunctionHour · Event team</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Checking your invitation</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Please wait while we verify your event access.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10 text-slate-950">
      <section aria-live="polite" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-900/5 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">FunctionHour · Event team</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          {event === null ? "Invitation unavailable" : access?.role ? "Opening your workspace" : "Checking your invitation"}
        </h1>
        {event === null ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">This event is unavailable. Ask the organizer to confirm the event and resend your staff link.</p>
        ) : (!isLoaded || (isSignedIn && (event === undefined || access === undefined)) || access?.role) ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">Please wait while we verify your event access.</p>
        ) : !isSignedIn ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">Taking you to staff sign-in…</p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              You’re signed in as <strong className="break-all">{email || "an account without a primary email"}</strong>, but this account does not have access to this event.
            </p>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-950">
              This invitation only works with the email address the organizer invited. Sign out and sign in with that address, or ask the organizer to verify the invitation email and event permissions.
            </div>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <SignOutButton redirectUrl={staffSignInUrl(eventId)}>
                <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-5 text-sm font-bold text-white hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">
                  Switch account
                </button>
              </SignOutButton>
              <Link href="/host" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Go to my events
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
