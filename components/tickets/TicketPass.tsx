"use client";

import { attendeeEventDate, attendeeVenue } from "@/lib/attendeeDisplay";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  ShieldCheck,
  TicketCheck,
  UserRound,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function TicketPass({ ticketId }: { ticketId: Id<"tickets"> }) {
  const [justPurchased, setJustPurchased] = useState(false);
  useEffect(() => { setJustPurchased(new URLSearchParams(window.location.search).get("purchase") === "complete"); }, []);
  const ticket = useQuery(api.tickets.getTicketDetails, { ticketId });

  if (ticket === undefined) {
    return <TicketPassLoading />;
  }

  if (!ticket || !ticket.event) {
    return <TicketUnavailable />;
  }

  // Check-in accepts ticket IDs. Encoding the ID keeps the QR compact and
  // avoids exposing the buyer's email in older stored QR tokens.
  const qrValue = String(ticket._id);
  const shortCode = String(ticket._id).slice(-8).toUpperCase();
  const isRevoked = Boolean(ticket.revokedAt) || ticket.status === "cancelled";
  const eventTime = getEventTime(
    ticket.event.eventDate,
    ticket.event.dateString,
  );
  const eventEnded = eventTime !== null && eventTime < Date.now();
  const status = isRevoked
    ? "Cancelled"
    : ticket.checkedIn
      ? "Checked in"
      : eventEnded
        ? "Event ended"
        : "Ready for entry";
  const statusClass = isRevoked
    ? "border-red-400/20 bg-red-400/10 text-red-300"
    : ticket.checkedIn
      ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-200"
      : eventEnded
        ? "border-white/10 bg-white/[0.04] text-zinc-700"
        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060c] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-16%] h-[520px] w-[520px] rounded-full bg-violet-700/20 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[540px] w-[540px] rounded-full bg-orange-500/15 blur-[160px]" />
      </div>

      <section className="relative mx-auto max-w-5xl">
        {justPurchased && !isRevoked && <div role="status" className="mb-5 flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-zinc-900"><CheckCircle2 className="text-violet-700" /><div><p className="text-xl font-black">You’re going!</p><p className="text-sm text-zinc-700">Your free ticket is confirmed. Keep this pass ready for entry.</p></div></div>}
        <Link
          href="/my-tickets"
          className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500 transition hover:text-zinc-950"
        >
          <ArrowLeft className="h-4 w-4" />
          My Tickets
        </Link>

        <div className="mt-5 grid overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0b16]/95 shadow-2xl shadow-black/50 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="relative p-5 sm:p-8">
            {ticket.imageUrl ? (
              <div className="relative mb-7 aspect-[16/8] overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950">
                <img
                  src={ticket.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-700">
                Function Hour Entry Pass
              </p>
              {status !== "Ready for entry" ? (
                <span
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] ${statusClass}`}
                >
                  {status}
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              {ticket.event.name}
            </h1>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <PassDetail
                icon={<CalendarDays className="h-5 w-5" />}
                label="Date"
                value={attendeeEventDate(ticket.event)}
              />
              <PassDetail
                icon={<MapPin className="h-5 w-5" />}
                label="Venue"
                value={attendeeVenue(ticket.event)}
              />
              <PassDetail
                icon={<UserRound className="h-5 w-5" />}
                label="Ticket holder"
                value={ticket.holder.name}
                detail={ticket.holder.email || undefined}
              />
              <PassDetail
                icon={<TicketCheck className="h-5 w-5" />}
                label="Ticket type"
                value={ticket.ticketTypeName || "Standard admission"}
              />
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniDetail
                label="Quantity"
                value={String(ticket.quantity ?? 1)}
              />
              <MiniDetail label="Price" value={formatMoney(ticket.unitPrice)} />
              <MiniDetail
                label="Purchased"
                value={formatPurchaseDate(ticket.purchasedAt)}
              />
              <MiniDetail label="Organizer" value={ticket.organizerName || "Event organizer"} />
            </div>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs leading-5 text-zinc-700">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-800" />
              <p>
                This pass is tied to your Function Hour account. Do not share
                the QR code publicly.
              </p>
            </div>
          </div>

          <aside className="flex flex-col items-center justify-center border-t border-white/10 bg-white/[0.025] p-6 text-center lg:border-l lg:border-t-0 sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
              Scan at entry
            </p>

            <div
              className={`mt-5 rounded-[1.75rem] bg-white p-5 shadow-[0_20px_70px_rgba(255,255,255,0.12)] ${isRevoked ? "opacity-35" : ""}`}
            >
              <QRCode
                value={qrValue}
                size={230}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#000000"
                style={{ display: "block", maxWidth: "100%", height: "auto" }}
                aria-label={`Entry QR code for ${ticket.event.name}`}
              />
            </div>

            <p className="mt-5 font-mono text-sm font-black tracking-[0.22em] text-white">
              {shortCode}
            </p>

            <div className="mt-6 flex items-start gap-2 text-left text-[11px] leading-5 text-zinc-500">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Turn up screen brightness and have this pass open before
                reaching the gate.
              </p>
            </div>

            {ticket.checkedInAt ? (
              <div className="mt-5 flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-xs font-bold text-yellow-200">
                <CheckCircle2 className="h-4 w-4" />
                Scanned {new Date(ticket.checkedInAt).toLocaleString()}
              </div>
            ) : null}
          </aside>
        </div>
        <footer className="mt-6 flex items-center justify-center gap-2 border-t border-zinc-200 pt-5">
          <img src="/function-hour-mark.svg" alt="" aria-hidden="true" className="h-9 w-12 object-contain" />
          <span className="text-lg font-black tracking-tight text-zinc-950">Function<span className="text-orange-700">Hour</span></span>
        </footer>
      </section>
    </main>
  );
}

function PassDetail({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ticket-pass-detail-icon bg-violet-50 text-violet-800">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
          {label}
        </span>
        <span className="mt-1 block break-words text-sm font-bold text-zinc-950">
          {value}
        </span>
        {detail ? (
          <span className="mt-1 block break-all text-[11px] text-zinc-600">
            {detail}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-zinc-950">{value}</p>
    </div>
  );
}

function formatMoney(value: number | undefined) {
  if (value === undefined) {
    return "Not recorded";
  }

  return value === 0
    ? "Free"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
}

function formatPurchaseDate(value: number | undefined) {
  if (value === undefined) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function getEventTime(
  eventDate: number | undefined,
  dateString: string | undefined,
) {
  if (typeof eventDate === "number" && Number.isFinite(eventDate)) {
    return eventDate;
  }

  const parsedDate = Date.parse(dateString || "");
  return Number.isNaN(parsedDate) ? null : parsedDate;
}

function TicketPassLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07060c] text-white">
      <div className="text-center">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
        <p className="mt-4 text-sm font-bold text-zinc-500">
          Preparing your pass...
        </p>
      </div>
    </main>
  );
}

function TicketUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07060c] px-5 text-white">
      <section className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 text-center">
        <h1 className="text-2xl font-black">Ticket unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          This ticket was not found or does not belong to your account.
        </p>
        <Link
          href="/my-tickets"
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-sm font-black text-black"
        >
          Return to My Tickets
        </Link>
      </section>
    </main>
  );
}
