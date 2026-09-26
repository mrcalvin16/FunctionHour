"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { CalendarDays, MapPin, TicketCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import EventRatingForm from "./EventRatingForm";

type UserTicket = FunctionReturnType<
  typeof api.tickets.getUserTickets
>[number];

type WalletView = "upcoming" | "past" | "all";

export default function TicketWalletList({
  tickets,
}: {
  tickets: UserTicket[];
}) {
  const [view, setView] = useState<WalletView>("upcoming");
  const now = useMemo(() => Date.now(), []);

  const organizedTickets = useMemo(() => {
    const withTime = tickets.map((ticket) => ({
      ticket,
      eventTime: getEventTime(ticket),
    }));

    const upcoming = withTime
      .filter(({ ticket, eventTime }) =>
        !ticket.checkedIn &&
        (eventTime === null || eventTime >= now)
      )
      .sort((a, b) => compareUpcoming(a.eventTime, b.eventTime));

    const past = withTime
      .filter(({ ticket, eventTime }) =>
        Boolean(ticket.checkedIn) ||
        (eventTime !== null && eventTime < now)
      )
      .sort((a, b) => (b.eventTime ?? 0) - (a.eventTime ?? 0));

    return {
      upcoming: upcoming.map(({ ticket }) => ticket),
      past: past.map(({ ticket }) => ticket),
      all: [...upcoming, ...past].map(({ ticket }) => ticket),
    };
  }, [tickets, now]);

  const ratingPromptTicketIds = useMemo(() => {
    const promptedEventIds = new Set<string>();
    const ticketIds = new Set<string>();

    for (const ticket of organizedTickets.past) {
      const eventId = String(ticket.eventId);

      if (ticket.checkedIn && !promptedEventIds.has(eventId)) {
        promptedEventIds.add(eventId);
        ticketIds.add(String(ticket._id));
      }
    }

    return ticketIds;
  }, [organizedTickets.past]);

  const visibleTickets = organizedTickets[view];

  return (
    <section>
      <div
        className="mb-6 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Ticket groups"
      >
        <WalletTab
          active={view === "upcoming"}
          count={organizedTickets.upcoming.length}
          label="Upcoming"
          onClick={() => setView("upcoming")}
        />
        <WalletTab
          active={view === "past"}
          count={organizedTickets.past.length}
          label="Past"
          onClick={() => setView("past")}
        />
        <WalletTab
          active={view === "all"}
          count={organizedTickets.all.length}
          label="All"
          onClick={() => setView("all")}
        />
      </div>

      {visibleTickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
          <TicketCheck className="mx-auto h-8 w-8 text-zinc-700" />
          <h2 className="mt-4 text-xl font-black">
            No {view} tickets
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {view === "upcoming"
              ? "Your next Function Hour ticket will appear here."
              : "There are no tickets in this group yet."}
          </p>
          {view === "upcoming" && organizedTickets.past.length > 0 ? (
            <button
              type="button"
              onClick={() => setView("past")}
              className="mt-5 min-h-11 rounded-xl border border-white/10 px-5 text-xs font-black text-zinc-300"
            >
              View past tickets
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5">
          {visibleTickets.map((ticket) => {
            const cancelled =
              Boolean(ticket.revokedAt) ||
              ticket.status === "cancelled";
            const eventTime = getEventTime(ticket);
            const eventEnded =
              eventTime !== null && eventTime < now;
            const status = cancelled
              ? "Cancelled"
              : ticket.checkedIn
                ? "Checked in"
                : eventEnded
                  ? "Event ended"
                  : null;

            return (
              <article
                key={ticket._id}
                className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-violet-400/30 sm:p-6"
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 to-orange-400" />

                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-600">
                      {ticket.ticketTypeName || "Function Hour Ticket"}
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
                      {ticket.event?.name || "Untitled Event"}
                    </h2>

                    <div className="mt-4 space-y-2 text-sm text-zinc-400">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-violet-300" />
                        {formatEventDate(ticket)}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-orange-300" />
                        {ticket.event?.location || "Location TBD"}
                      </p>
                    </div>

                    <Link
                      href={`/events/${ticket.eventId}`}
                      className="mt-4 inline-flex text-xs font-black text-zinc-500 transition hover:text-white"
                    >
                      View event →
                    </Link>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 md:items-end">
                    {status ? (
                      <span className={`text-xs font-bold ${cancelled ? "text-red-300" : ticket.checkedIn ? "text-yellow-300" : "text-zinc-400"}`}>
                        {status}
                      </span>
                    ) : null}

                    <Link
                      href={`/tickets/${ticket._id}`}
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-black transition hover:bg-orange-200 md:w-auto"
                    >
                      Open ticket
                    </Link>
                  </div>
                </div>

                {ratingPromptTicketIds.has(String(ticket._id)) ? (
                  <EventRatingForm eventId={ticket.eventId} />
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WalletTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${
        active
          ? "border-violet-400/40 bg-violet-400/15 text-white"
          : "border-white/10 bg-white/[0.025] text-zinc-500 hover:text-white"
      }`}
    >
      {label}
      <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px]">
        {count}
      </span>
    </button>
  );
}

function getEventTime(ticket: UserTicket) {
  const eventDate = ticket.event?.eventDate;

  if (typeof eventDate === "number" && Number.isFinite(eventDate)) {
    return eventDate;
  }

  const parsedDate = Date.parse(ticket.event?.dateString || "");
  return Number.isNaN(parsedDate) ? null : parsedDate;
}

function compareUpcoming(left: number | null, right: number | null) {
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function formatEventDate(ticket: UserTicket) {
  const eventTime = getEventTime(ticket);

  if (eventTime === null) {
    return ticket.event?.dateString || "Date TBD";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(eventTime);
}
