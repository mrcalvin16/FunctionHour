"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { api } from "@/convex/_generated/api";

export default function OrganizerVerificationRequests() {
  const requests = useQuery(api.organizers.getOrganizerVerificationRequests, {});
  const setOrganizerVerified = useMutation(api.organizers.setOrganizerVerified);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function approve(userId: string) {
    setBusyUserId(userId);
    setMessage("");
    try {
      await setOrganizerVerified({ userId, verified: true });
      setMessage("Organizer approved. Their public profile now shows the verified badge.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to approve this request.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-8">
        <Link href="/admin/finance" className="text-sm font-semibold text-violet-700 hover:underline">
          ← Operations
        </Link>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Function Hour Operations</p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-950">Organizer verification</h1>
        <p className="mt-2 text-sm text-zinc-600">Review requests sent to operations@functionhour.com. Approving a request immediately enables the blue check on the organizer’s public profile.</p>
      </header>

      {message ? (
        <p role="status" className="mb-5 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">{message}</p>
      ) : null}

      {requests === undefined ? (
        <div className="rounded-2xl border border-black/10 bg-white p-6 text-sm text-zinc-500">Loading verification requests…</div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
          <BadgeCheck className="mx-auto h-8 w-8 text-blue-600" />
          <h2 className="mt-3 text-xl font-semibold text-zinc-950">No pending requests</h2>
          <p className="mt-2 text-sm text-zinc-500">New requests will appear here after an organizer submits one from Host Profile.</p>
        </div>
      ) : (
        <section className="space-y-4">
          {requests.map((request) => {
            const profileUrl = request.userId ? `/organizers/${encodeURIComponent(request.userId)}` : null;
            return (
              <article key={request.userId} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-950">{request.organizerName}</h2>
                    {request.email ? <a href={`mailto:${encodeURIComponent(request.email)}`} className="mt-1 inline-block text-sm text-zinc-600 hover:underline">{request.email}</a> : null}
                    <p className="mt-2 text-xs text-zinc-500">
                      Requested {request.verificationRequestedAt ? new Date(request.verificationRequestedAt).toLocaleString() : "date unavailable"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      {profileUrl ? <a href={profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-violet-700 hover:underline">Public profile <ExternalLink className="h-3.5 w-3.5" /></a> : null}
                      {request.website ? <a href={request.website} target="_blank" rel="noreferrer" className="text-violet-700 hover:underline">Website</a> : null}
                      {request.instagram ? <span className="text-zinc-600">Instagram: {request.instagram}</span> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void approve(request.userId)}
                    disabled={!request.userId || busyUserId !== null}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <BadgeCheck className="h-4 w-4" />
                    {busyUserId === request.userId ? "Approving…" : "Approve blue check"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
