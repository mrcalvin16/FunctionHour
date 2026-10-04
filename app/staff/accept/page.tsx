import { parseEventId } from "@/lib/eventStaff";
import StaffInvitationLanding from "@/components/host/team/StaffInvitationLanding";

export default async function StaffAcceptPage({
  searchParams,
}: {
  searchParams?: Promise<{ eventId?: string | string[] }>;
}) {
  const params = searchParams ? await searchParams : {};
  const eventId = parseEventId(params.eventId);

  if (!eventId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-10 text-slate-950">
        <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <h1 className="text-2xl font-black">Invitation link unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Ask the event organizer to send you a new staff sign-in link.</p>
        </section>
      </main>
    );
  }

  return <StaffInvitationLanding eventId={eventId} />;
}
