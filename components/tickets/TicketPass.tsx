"use client";

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
  const ticket = useQuery(api.tickets.getTicketDetails, { ticketId });

  if (ticket === undefined) {
    return <TicketPassLoading />;
  }

  if (!ticket || !ticket.event) {
    return <TicketUnavailable />;
  }

  const qrValue = ticket.qrCode || String(ticket._id);
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
        ? "border-white/10 bg-white/[0.04] text-zinc-400"
        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060c] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-16%] h-[520px] w-[520px] rounded-full bg-violet-700/20 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[540px] w-[540px] rounded-full bg-orange-500/15 blur-[160px]" />
      </div>

      <section className="relative mx-auto max-w-5xl">
        <Link
          href="/my-tickets"
          className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500 transition hover:text-white"
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
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">
                Function Hour Entry Pass
              </p>
              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] ${statusClass}`}
              >
                {status}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              {ticket.event.name}
            </h1>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <PassDetail
                icon={<CalendarDays className="h-5 w-5" />}
                label="Date"
                value={ticket.event.dateString || "Date TBD"}
              />
              <PassDetail
                icon={<MapPin className="h-5 w-5" />}
                label="Location"
                value={ticket.event.location || "Location TBD"}
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
              <MiniDetail label="Source" value={ticket.sourceName} />
            </div>

            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs leading-5 text-zinc-400">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
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
    <div className="flex min-w-0 gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
          {label}
        </span>
        <span className="mt-1 block break-words text-sm font-bold text-zinc-200">
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
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-black text-white">{value}</p>
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
