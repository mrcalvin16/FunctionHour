"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type HostedEvent = {
  _id: Id<"events">;
  name?: string;
  eventDate?: number;
  dateString?: string;
  location?: string;
};

type TicketType = {
  _id: Id<"ticketTypes">;
  name: string;
  price: number;
  isActive?: boolean;
  isSoldOut?: boolean;
};

type CompTicket = {
  _id: Id<"compTickets">;
  eventId: Id<"events">;
  ticketId?: Id<"tickets">;
  ticketTypeId?: Id<"ticketTypes">;
  ticketTypeName?: string;
  recipientName: string;
  recipientEmail: string;
  quantity: number;
  note?: string;
  status: "active" | "revoked" | "redeemed";
  issuedBy: string;
  issuedAt: number;
  revokedAt?: number;
  lastSentAt?: number;
};

type StatusFilter = "all" | "active" | "redeemed" | "revoked";

function formatDate(value?: number): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function eventDateLabel(event: HostedEvent): string {
  if (event.dateString) {
    return event.dateString;
  }

  return formatDate(event.eventDate);
}

function statusClasses(status: CompTicket["status"]): string {
  if (status === "active") {
    return [
      "border-emerald-400/20",
      "bg-emerald-400/10",
      "text-emerald-200",
    ].join(" ");
  }

  if (status === "redeemed") {
    return ["border-violet-400/20", "bg-violet-400/10", "text-violet-200"].join(
      " ",
    );
  }

  return ["border-red-400/20", "bg-red-400/10", "text-red-200"].join(" ");
}

function inputClasses(): string {
  return [
    "min-h-12",
    "w-full",
    "rounded-2xl",
    "border",
    "border-white/10",
    "bg-black/40",
    "px-4",
    "text-sm",
    "text-white",
    "outline-none",
    "transition",
    "placeholder:text-zinc-600",
    "focus:border-violet-400/60",
    "focus:ring-4",
    "focus:ring-violet-500/10",
  ].join(" ");
}

type CompTicketsWorkspaceProps = {
  initialEventId?: Id<"events">;
  embedded?: boolean;
};

export default function CompTicketsWorkspace({
  initialEventId,
  embedded = false,
}: CompTicketsWorkspaceProps) {
  const { isSignedIn } = useUser();

  const events = useQuery(api.events.getMyEvents, isSignedIn ? {} : "skip") as
    | HostedEvent[]
    | undefined;

  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | null>(
    initialEventId ?? null,
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [searchTerm, setSearchTerm] = useState("");

  const [recipientName, setRecipientName] = useState("");

  const [recipientEmail, setRecipientEmail] = useState("");

  const [ticketTypeId, setTicketTypeId] = useState("");

  const [quantity, setQuantity] = useState("1");

  const [note, setNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (initialEventId && initialEventId !== selectedEventId) {
      setSelectedEventId(initialEventId);
      return;
    }

    if (!selectedEventId && events && events.length > 0) {
      setSelectedEventId(events[0]._id);
    }
  }, [events, initialEventId, selectedEventId]);

  const selectedEvent = useMemo(() => {
    return events?.find((event) => event._id === selectedEventId);
  }, [events, selectedEventId]);

  const ticketTypes = useQuery(
    api.ticketTypes.getByEvent,
    selectedEventId
      ? {
          eventId: selectedEventId,
        }
      : "skip",
  ) as TicketType[] | undefined;

  const compTickets = useQuery(
    api.compTickets.listForEvent,
    selectedEventId
      ? {
          eventId: selectedEventId,
        }
      : "skip",
  ) as CompTicket[] | undefined;

  const issueCompTicket = useMutation(api.compTickets.issue);

  const revokeCompTicket = useMutation(api.compTickets.revoke);

  const restoreCompTicket = useMutation(api.compTickets.restore);

  const markCompTicketResent = useMutation(api.compTickets.markResent);

  const stats = useMemo(() => {
    const list = compTickets ?? [];

    return {
      allocations: list.length,

      totalTickets: list.reduce((sum, ticket) => sum + ticket.quantity, 0),

      active: list
        .filter((ticket) => ticket.status === "active")
        .reduce((sum, ticket) => sum + ticket.quantity, 0),

      redeemed: list
        .filter((ticket) => ticket.status === "redeemed")
        .reduce((sum, ticket) => sum + ticket.quantity, 0),

      revoked: list
        .filter((ticket) => ticket.status === "revoked")
        .reduce((sum, ticket) => sum + ticket.quantity, 0),
    };
  }, [compTickets]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return (compTickets ?? []).filter((ticket) => {
      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        ticket.recipientName.toLowerCase().includes(normalizedSearch) ||
        ticket.recipientEmail.toLowerCase().includes(normalizedSearch) ||
        (ticket.ticketTypeName ?? "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [compTickets, searchTerm, statusFilter]);

  function clearMessages() {
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleIssueTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (!selectedEventId) {
      setErrorMessage("Select an event first.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      setErrorMessage("Enter a valid ticket quantity.");
      return;
    }

    setIsSubmitting(true);

    try {
      const issued = await issueCompTicket({
        eventId: selectedEventId,

        ticketTypeId: ticketTypeId
          ? (ticketTypeId as Id<"ticketTypes">)
          : undefined,

        recipientName,
        recipientEmail,
        quantity: parsedQuantity,
        note: note.trim() || undefined,
      });

      const deliveryResponse = await fetch("/api/email/comp-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compTicketId: issued.compTicketId }),
      });
      const delivery = await deliveryResponse.json();

      if (!deliveryResponse.ok) {
        throw new Error(
          `Ticket created, but email delivery failed: ${delivery.error || "Please use Resend."}`,
        );
      }

      setRecipientName("");
      setRecipientEmail("");
      setTicketTypeId("");
      setQuantity("1");
      setNote("");

      setSuccessMessage(
        "Complimentary ticket issued and emailed successfully.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to issue the ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevoke(ticket: CompTicket) {
    if (!selectedEventId) {
      return;
    }

    const confirmed = window.confirm(
      `Revoke the complimentary ticket for ${ticket.recipientName}?`,
    );

    if (!confirmed) {
      return;
    }

    clearMessages();
    setBusyTicketId(ticket._id);

    try {
      await revokeCompTicket({
        eventId: selectedEventId,
        compTicketId: ticket._id,
      });

      setSuccessMessage(`Ticket for ${ticket.recipientName} was revoked.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to revoke the ticket.",
      );
    } finally {
      setBusyTicketId(null);
    }
  }

  async function handleRestore(ticket: CompTicket) {
    if (!selectedEventId) {
      return;
    }

    clearMessages();
    setBusyTicketId(ticket._id);

    try {
      await restoreCompTicket({
        eventId: selectedEventId,
        compTicketId: ticket._id,
      });

      setSuccessMessage(`Ticket for ${ticket.recipientName} was restored.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to restore the ticket.",
      );
    } finally {
      setBusyTicketId(null);
    }
  }

  async function handleResend(ticket: CompTicket) {
    if (!selectedEventId) {
      return;
    }

    clearMessages();
    setBusyTicketId(ticket._id);

    try {
      const deliveryResponse = await fetch("/api/email/comp-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compTicketId: ticket._id }),
      });
      const delivery = await deliveryResponse.json();

      if (!deliveryResponse.ok) {
        throw new Error(
          delivery.error || "Unable to deliver the ticket email.",
        );
      }

      await markCompTicketResent({
        eventId: selectedEventId,
        compTicketId: ticket._id,
      });

      setSuccessMessage(`Ticket emailed again to ${ticket.recipientEmail}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to record the resend.",
      );
    } finally {
      setBusyTicketId(null);
    }
  }

  if (isSignedIn === false) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-black">Sign in required</h1>

          <p className="mt-3 text-zinc-400">
            Sign in to manage complimentary tickets.
          </p>

          <Link
            href="/sign-in"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-black"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        embedded
          ? "overflow-x-hidden text-white"
          : "min-h-screen overflow-x-hidden bg-black pb-28 text-white md:pb-12"
      }
    >
      {!embedded ? (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-[-20%] top-[-15%] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[140px]" />

          <div className="absolute right-[-20%] top-[25%] h-[520px] w-[520px] rounded-full bg-orange-500/10 blur-[150px]" />

          <div className="absolute bottom-[-20%] left-[25%] h-[520px] w-[520px] rounded-full bg-violet-800/20 blur-[150px]" />

          <div className="absolute inset-0 opacity-[0.025]">
            <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:72px_72px]" />
          </div>
        </div>
      ) : null}

      <section
        className={`relative mx-auto max-w-7xl ${
          embedded ? "" : "px-4 py-6 sm:px-6 sm:py-10 lg:px-8"
        }`}
      >
        {!embedded ? (
          <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_0_100px_rgba(139,92,246,0.12)] backdrop-blur-2xl sm:p-9">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-violet-200">
                  Function Hour Organizer OS
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                  Comp Tickets
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                  Issue and manage complimentary admission for guests, sponsors,
                  artists, partners, and event staff.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/host"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-black transition hover:bg-white/10"
                >
                  Host Dashboard
                </Link>

                <Link
                  href="/host/check-in"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-orange-500 px-5 text-sm font-black shadow-[0_0_35px_rgba(139,92,246,0.3)] transition hover:scale-[1.02]"
                >
                  Check-In
                </Link>
              </div>
            </div>
          </header>
        ) : null}

        {!embedded ? (
          <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6">
            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Managing Event
            </label>

            <select
              value={selectedEventId ?? ""}
              onChange={(event) => {
                setSelectedEventId(
                  event.target.value
                    ? (event.target.value as Id<"events">)
                    : null,
                );

                clearMessages();
              }}
              className={`${inputClasses()} mt-3`}
            >
              <option value="">Select an event</option>

              {(events ?? []).map((event) => (
                <option key={event._id} value={event._id}>
                  {event.name ?? "Untitled Event"} — {eventDateLabel(event)}
                </option>
              ))}
            </select>

            {selectedEvent && (
              <p className="mt-3 text-sm text-zinc-500">
                {selectedEvent.location ?? "Location pending"}
              </p>
            )}
          </section>
        ) : null}

        {!events ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center text-zinc-500">
            Loading your events...
          </div>
        ) : events.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center">
            <h2 className="text-2xl font-black">Create an event first</h2>

            <p className="mt-3 text-zinc-500">
              Complimentary tickets must be connected to an event.
            </p>

            <Link
              href="/host/create"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-black"
            >
              Create Event
            </Link>
          </div>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <StatCard label="Allocations" value={stats.allocations} />

              <StatCard label="Tickets Issued" value={stats.totalTickets} />

              <StatCard label="Active" value={stats.active} />

              <StatCard label="Redeemed" value={stats.redeemed} />

              <StatCard label="Revoked" value={stats.revoked} />
            </section>

            {(successMessage || errorMessage) && (
              <div
                className={[
                  "mt-6 rounded-2xl border p-4 text-sm font-bold",
                  errorMessage
                    ? "border-red-400/20 bg-red-400/10 text-red-200"
                    : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
                ].join(" ")}
              >
                {errorMessage || successMessage}
              </div>
            )}

            <section className="mt-6 grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
              <form
                onSubmit={handleIssueTicket}
                className="h-fit rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-2xl sm:p-7"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-300">
                    New Allocation
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Issue Comp Ticket
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Create a guest ticket connected to the selected event.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <Field label="Recipient Name" htmlFor="recipientName">
                    <input
                      id="recipientName"
                      value={recipientName}
                      onChange={(event) => setRecipientName(event.target.value)}
                      placeholder="Guest name"
                      required
                      className={inputClasses()}
                    />
                  </Field>

                  <Field label="Recipient Email" htmlFor="recipientEmail">
                    <input
                      id="recipientEmail"
                      type="email"
                      value={recipientEmail}
                      onChange={(event) =>
                        setRecipientEmail(event.target.value)
                      }
                      placeholder="guest@example.com"
                      required
                      className={inputClasses()}
                    />
                  </Field>

                  <Field label="Ticket Type" htmlFor="ticketType">
                    <select
                      id="ticketType"
                      value={ticketTypeId}
                      onChange={(event) => setTicketTypeId(event.target.value)}
                      className={inputClasses()}
                    >
                      <option value="">Complimentary Admission</option>

                      {(ticketTypes ?? [])
                        .filter((ticketType) => ticketType.isActive !== false)
                        .map((ticketType) => (
                          <option key={ticketType._id} value={ticketType._id}>
                            {ticketType.name}
                            {ticketType.isSoldOut ? " — Sold Out" : ""}
                          </option>
                        ))}
                    </select>
                  </Field>

                  <Field label="Quantity" htmlFor="quantity">
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      max="25"
                      step="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                      className={inputClasses()}
                    />
                  </Field>

                  <Field label="Internal Note" htmlFor="note">
                    <textarea
                      id="note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Sponsor, artist guest list, media, staff..."
                      rows={4}
                      className={`${inputClasses()} resize-none py-3`}
                    />
                  </Field>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedEventId}
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-orange-500 px-5 text-sm font-black shadow-[0_0_35px_rgba(139,92,246,0.3)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Issuing Ticket..."
                    : "Issue Complimentary Ticket"}
                </button>

                <p className="mt-4 text-center text-xs leading-5 text-zinc-600">
                  Email delivery will be connected in the next phase. The ticket
                  and QR record are created immediately.
                </p>
              </form>

              <section className="min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-violet-300">
                      Guest List
                    </p>

                    <h2 className="mt-2 text-2xl font-black">Issued Tickets</h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      {filteredTickets.length} record
                      {filteredTickets.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search guests..."
                      className={inputClasses()}
                    />

                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(event.target.value as StatusFilter)
                      }
                      className={inputClasses()}
                    >
                      <option value="all">All Statuses</option>

                      <option value="active">Active</option>

                      <option value="redeemed">Redeemed</option>

                      <option value="revoked">Revoked</option>
                    </select>
                  </div>
                </div>

                {!compTickets ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-10 text-center text-sm text-zinc-500">
                    Loading complimentary tickets...
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
                    <p className="text-lg font-black">No comp tickets found</p>

                    <p className="mt-2 text-sm text-zinc-500">
                      Issue the first complimentary ticket using the form.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {filteredTickets.map((ticket) => {
                      const isBusy = busyTicketId === ticket._id;

                      return (
                        <article
                          key={ticket._id}
                          className="rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-white/20 sm:p-5"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-black">
                                  {ticket.recipientName}
                                </h3>

                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${statusClasses(
                                    ticket.status,
                                  )}`}
                                >
                                  {ticket.status}
                                </span>
                              </div>

                              <p className="mt-1 truncate text-sm text-zinc-400">
                                {ticket.recipientEmail}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                                <span>
                                  <strong className="text-zinc-300">
                                    {ticket.ticketTypeName ??
                                      "Complimentary Admission"}
                                  </strong>
                                </span>

                                <span>
                                  Quantity:{" "}
                                  <strong className="text-zinc-300">
                                    {ticket.quantity}
                                  </strong>
                                </span>

                                <span>
                                  Issued:{" "}
                                  <strong className="text-zinc-300">
                                    {formatDate(ticket.issuedAt)}
                                  </strong>
                                </span>

                                {ticket.lastSentAt && (
                                  <span>
                                    Last sent:{" "}
                                    <strong className="text-zinc-300">
                                      {formatDate(ticket.lastSentAt)}
                                    </strong>
                                  </span>
                                )}
                              </div>

                              {ticket.note && (
                                <p className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-xs leading-5 text-zinc-500">
                                  {ticket.note}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              {ticket.status !== "revoked" && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleResend(ticket)}
                                  className="min-h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black transition hover:bg-white/10 disabled:opacity-50"
                                >
                                  Resend
                                </button>
                              )}

                              {ticket.status === "revoked" ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRestore(ticket)}
                                  className="min-h-10 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 text-xs font-black text-emerald-200 transition hover:bg-emerald-400/20 disabled:opacity-50"
                                >
                                  Restore
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleRevoke(ticket)}
                                  className="min-h-10 rounded-xl border border-red-400/20 bg-red-400/10 px-4 text-xs font-black text-red-200 transition hover:bg-red-400/20 disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl sm:p-5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
    </article>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500"
      >
        {label}
      </label>

      {children}
    </div>
  );
}
