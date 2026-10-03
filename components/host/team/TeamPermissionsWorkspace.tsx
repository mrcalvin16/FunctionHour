"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, ShieldCheck, UserPlus, Users, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const roles = [
  { value: "admin", label: "Admin", capabilities: "Event, team, tickets, check-in, marketing, reports" },
  { value: "ticket_manager", label: "Ticket Manager", capabilities: "Tickets, comps, check-in, reports" },
  { value: "check_in_staff", label: "Check-In Staff", capabilities: "Event-day check-in only" },
  { value: "marketing", label: "Marketing", capabilities: "Flyers, messages, and reports" },
  { value: "viewer", label: "Viewer", capabilities: "Read-only reports" },
] as const;

type StaffRole = (typeof roles)[number]["value"];

export default function TeamPermissionsWorkspace({
  fixedEventId,
}: {
  fixedEventId?: Id<"events">;
}) {
  const events = useQuery(api.events.getMyEvents);
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | undefined>(fixedEventId);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("check_in_staff");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!fixedEventId && !selectedEventId && events?.[0]?._id) {
      setSelectedEventId(events[0]._id);
    }
  }, [events, fixedEventId, selectedEventId]);

  const members = useQuery(
    api.eventAccess.listEventTeam,
    selectedEventId ? { eventId: selectedEventId } : "skip"
  );
  const inviteMember = useMutation(api.eventAccess.inviteEventTeamMember);
  const updateRole = useMutation(api.eventAccess.updateEventTeamMemberRole);
  const revokeMember = useMutation(api.eventAccess.revokeEventTeamMember);

  const selectedEvent = useMemo(
    () => events?.find((event) => event._id === selectedEventId),
    [events, selectedEventId]
  );

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEventId || busy) return;

    setBusy(true);
    setMessage("");
    setError("");
    try {
      const memberId = await inviteMember({
        eventId: selectedEventId,
        email,
        name: name.trim() || undefined,
        role,
      });
      const delivery = await sendInvitationEmail(memberId);
      setName("");
      setEmail("");
      setRole("check_in_staff");
      if (delivery.ok) {
        setMessage("Invitation email sent. Access activates when they sign in with the invited email.");
      } else {
        setError(`Team access was added, but the invitation email could not be sent. ${delivery.error}`);
      }
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to add this team member.");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvitationEmail(memberId: Id<"eventTeamMembers">) {
    const response = await fetch("/api/email/event-team-invitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, requestId: crypto.randomUUID() }),
    });
    const result = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      error: typeof result.error === "string" ? result.error : "Please try again.",
    };
  }

  async function handleResendInvitation(memberId: Id<"eventTeamMembers">) {
    setError("");
    setMessage("");
    try {
      const result = await sendInvitationEmail(memberId);
      if (!result.ok) throw new Error(result.error);
      setMessage("Invitation email sent.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send the invitation email.");
    }
  }
  async function handleRoleChange(memberId: Id<"eventTeamMembers">, nextRole: StaffRole) {
    if (!selectedEventId) return;
    setError("");
    try {
      await updateRole({ eventId: selectedEventId, memberId, role: nextRole });
      setMessage("Permissions updated.");
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Unable to update permissions.");
    }
  }

  async function handleRevoke(memberId: Id<"eventTeamMembers">) {
    if (!selectedEventId || !window.confirm("Revoke this team member’s event access?")) return;
    setError("");
    try {
      await revokeMember({ eventId: selectedEventId, memberId });
      setMessage("Team access revoked.");
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke access.");
    }
  }

  async function copyWorkspaceLink() {
    if (!selectedEventId) return;
    await navigator.clipboard.writeText(`${window.location.origin}/host/events/${selectedEventId}`);
    setMessage("Event workspace link copied.");
  }

  return (
    <div className="space-y-5">
      {!fixedEventId && (
        <section className="rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/85 p-5 sm:p-6">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400" htmlFor="team-event">
            Manage team for
          </label>
          <select
            id="team-event"
            value={selectedEventId ?? ""}
            onChange={(event) => setSelectedEventId(event.target.value as Id<"events">)}
            className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-bold text-white outline-none focus:border-violet-400/50"
          >
            <option value="" disabled>Select an event</option>
            {(events ?? []).map((event) => (
              <option key={event._id} value={event._id}>{event.name}</option>
            ))}
          </select>
        </section>
      )}

      {!selectedEventId ? (
        <EmptyTeam />
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
            <div className="rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/85 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Event Team</p>
                  <h2 className="mt-2 text-2xl font-black">{selectedEvent?.name ?? "Event staff"}</h2>
                  <p className="mt-1 text-sm text-zinc-500">Assign role-based access without sharing your organizer login.</p>
                </div>
                <button
                  type="button"
                  onClick={copyWorkspaceLink}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-black text-zinc-400 hover:text-white"
                >
                  <Copy className="h-4 w-4" /> Copy workspace link
                </button>
              </div>

              {message && <p className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300"><Check className="mr-2 inline h-4 w-4" />{message}</p>}
              {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}

              <div className="mt-5 space-y-3">
                {members === undefined ? (
                  <div className="h-32 animate-pulse rounded-2xl bg-white/[0.03]" />
                ) : members.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-zinc-600">No additional staff yet.</div>
                ) : members.map((member) => (
                  <article key={member._id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-black/25 p-4 lg:flex-row lg:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300"><Users className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">{member.name || member.email || "Event staff"}</p>
                      <p className="mt-1 truncate text-xs text-zinc-600">{member.email} · {member.status}</p>
                    </div>
                    <select
                      aria-label={`Role for ${member.name || member.email}`}
                      value={member.role}
                      disabled={member.status === "revoked"}
                      onChange={(event) => handleRoleChange(member._id, event.target.value as StaffRole)}
                      className="min-h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {roles.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}
                    </select>
                    {member.status === "invited" && (
                      <button
                        type="button"
                        onClick={() => handleResendInvitation(member._id)}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-400/20 px-3 text-xs font-black text-violet-200 hover:bg-violet-400/10"
                      >
                        Resend invite
                      </button>
                    )}
                    {member.status !== "revoked" && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(member._id)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/15 px-3 text-xs font-black text-red-300 hover:bg-red-400/10"
                      >
                        <X className="h-4 w-4" /> Revoke
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <form onSubmit={handleInvite} className="h-fit rounded-[1.5rem] border border-white/[0.08] bg-gradient-to-br from-[#171128] to-[#15100e] p-5 sm:p-6">
              <UserPlus className="h-6 w-6 text-orange-400" />
              <h2 className="mt-3 text-xl font-black">Invite team member</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">We’ll email them a link to the event workspace. Access activates when they sign in with this email.</p>
              <div className="mt-5 space-y-3">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name (optional)" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none focus:border-violet-400/50" />
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@example.com" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none focus:border-violet-400/50" />
                <select value={role} onChange={(event) => setRole(event.target.value as StaffRole)} className="min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-bold outline-none">
                  {roles.map((roleOption) => <option key={roleOption.value} value={roleOption.value}>{roleOption.label}</option>)}
                </select>
                <button disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-sm font-black disabled:opacity-50">
                  {busy ? "Sending invitation…" : "Send invitation"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[1.5rem] border border-white/[0.08] bg-[#0c0b14]/85 p-5 sm:p-6">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-violet-300" /><h2 className="text-xl font-black">Permission levels</h2></div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {roles.map((roleOption) => (
                <div key={roleOption.value} className="rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                  <p className="text-sm font-black text-white">{roleOption.label}</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-600">{roleOption.capabilities}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyTeam() {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 px-6 py-16 text-center">
      <Users className="mx-auto h-8 w-8 text-zinc-700" />
      <h2 className="mt-4 text-xl font-black">Create an event first</h2>
      <p className="mt-2 text-sm text-zinc-600">Team permissions are assigned per event.</p>
    </div>
  );
}
