"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseEventId, staffAcceptUrl, staffSignInUrl } from "@/lib/eventStaff";

export default function StaffSignUpPage() {
  const searchParams = useSearchParams();
  const eventId = parseEventId(searchParams.get("eventId") ?? undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-900/5 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">FunctionHour · Event team</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Create staff account</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          Use the exact email address the organizer invited. Your account will only receive that event’s assigned permissions.
        </p>
        {eventId ? (
          <div className="mt-7 flex justify-center">
            <SignUp
              path="/staff/sign-up"
              routing="path"
              signInUrl={staffSignInUrl(eventId)}
              forceRedirectUrl={staffAcceptUrl(eventId)}
              fallbackRedirectUrl={staffAcceptUrl(eventId)}
            />
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-950">
            This staff link is missing a valid event. Ask the organizer to resend the invitation.
          </div>
        )}
        <Link href={eventId ? staffSignInUrl(eventId) : "/sign-in"} className="mt-6 inline-block text-sm font-semibold text-violet-700 underline underline-offset-4">
          Already have an account? Sign in
        </Link>
      </section>
    </main>
  );
}
