import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { parseEventId, staffAcceptUrl, staffSignInUrl } from "@/lib/eventStaff";

export default async function StaffSignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ eventId?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const eventId = parseEventId(params.eventId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-900/5 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">FunctionHour · Event team</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Staff sign-in</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          Sign in with the email address the organizer invited. We’ll open the event workspace assigned to your role.
        </p>
        {eventId ? (
          <div className="mt-7 flex justify-center">
            <SignIn
              path="/staff/sign-in"
              routing="path"
              signUpUrl={`/staff/sign-up?eventId=${encodeURIComponent(eventId)}`}
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
          FunctionHour account help
        </Link>
      </section>
    </main>
  );
}
