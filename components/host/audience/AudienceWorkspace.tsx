"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Download,
  Mail,
  Search,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";

type AttendanceFilter = "all" | "checked-in" | "awaiting";

export default function AudienceWorkspace() {
  const audience = useQuery(api.audience.getOrganizerAudience, { limit: 500 });
  const [search, setSearch] = useState("");
  const [eventName, setEventName] = useState("all");
  const [attendance, setAttendance] = useState<AttendanceFilter>("all");

  const eventNames = useMemo(
    () =>
      Array.from(
        new Set((audience ?? []).flatMap((guest) => guest.eventNames)),
      ).sort((a, b) => a.localeCompare(b)),
    [audience],
  );

  const summary = useMemo(() => {
    const guests = audience ?? [];
    return {
      guests: guests.length,
      tickets: guests.reduce((total, guest) => total + guest.ticketCount, 0),
      checkedIn: guests.filter((guest) => guest.checkedInCount > 0).length,
      repeat: guests.filter((guest) => guest.eventIds.length > 1).length,
    };
  }, [audience]);

  const visibleGuests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (audience ?? []).filter((guest) => {
      const matchesSearch =
        !query ||
        guest.name.toLowerCase().includes(query) ||
        guest.email.toLowerCase().includes(query) ||
        guest.eventNames.some((name) => name.toLowerCase().includes(query)) ||
        guest.ticketTypes.some((name) => name.toLowerCase().includes(query));
      const matchesEvent =
        eventName === "all" || guest.eventNames.includes(eventName);
      const matchesAttendance =
        attendance === "all" ||
        (attendance === "checked-in" && guest.checkedInCount > 0) ||
        (attendance === "awaiting" && guest.checkedInCount === 0);

      return matchesSearch && matchesEvent && matchesAttendance;
    });
  }, [attendance, audience, eventName, search]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
            Guest intelligence
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Audience
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Understand and export your attendee relationships across every
            event.
          </p>
        </div>
        <Link href="/host/exports" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-xs font-black text-white"><Download className="h-4 w-4" /> Secure exports</Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Unique guests" value={summary.guests} icon={Users} />
        <Metric
          label="Tickets held"
          value={summary.tickets}
          icon={Ticket}
          accent="text-orange-400"
        />
        <Metric
          label="Guests arrived"
          value={summary.checkedIn}
          icon={CheckCircle2}
          accent="text-emerald-400"
        />
        <Metric
          label="Repeat guests"
          value={summary.repeat}
          icon={UserRound}
          accent="text-fuchsia-400"
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035]">
        <div className="grid gap-3 border-b border-white/[0.07] p-4 lg:grid-cols-[minmax(260px,1fr)_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guests, events, or ticket types"
              className="min-h-12 w-full rounded-xl border border-white/[0.08] bg-black/30 pl-11 pr-4 text-sm font-semibold outline-none placeholder:text-zinc-700 focus:border-orange-400/40"
            />
          </label>
          <select
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            className="min-h-12 rounded-xl border border-white/[0.08] bg-[#0d0b13] px-4 text-sm font-bold text-zinc-300 outline-none focus:border-orange-400/40"
          >
            <option value="all">All events</option>
            {eventNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 overflow-x-auto">
            {(["all", "checked-in", "awaiting"] as AttendanceFilter[]).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAttendance(option)}
                  className={`min-h-12 whitespace-nowrap rounded-xl px-4 text-xs font-black capitalize transition ${attendance === option ? "bg-white text-black" : "border border-white/[0.08] bg-white/[0.03] text-zinc-500 hover:text-white"}`}
                >
                  {option.replace("-", " ")}
                </button>
              ),
            )}
          </div>
        </div>

        {audience === undefined ? (
          <LoadingRows />
        ) : visibleGuests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <UserRound className="mx-auto h-8 w-8 text-zinc-700" />
            <p className="mt-4 text-sm font-black">No audience members found</p>
            <p className="mt-1 text-xs text-zinc-600">
              Completed ticket purchases will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {visibleGuests.map((guest) => (
              <article
                key={guest.id}
                className="grid gap-4 px-4 py-4 transition hover:bg-white/[0.025] md:grid-cols-[minmax(0,1fr)_minmax(180px,0.7fr)_auto] md:items-center sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-sm font-black text-violet-300">
                    {getInitials(guest.name, guest.email)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{guest.name}</p>
                    {guest.email ? (
                      <a
                        href={`mailto:${guest.email}`}
                        className="mt-1 flex items-center gap-1 truncate text-xs text-zinc-600 hover:text-orange-300"
                      >
                        <Mail className="h-3 w-3 shrink-0" /> {guest.email}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-600">
                        No email available
                      </p>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-zinc-300">
                    {guest.eventNames.join(", ")}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    {guest.ticketCount} ticket
                    {guest.ticketCount === 1 ? "" : "s"} ·{" "}
                    {guest.eventIds.length} event
                    {guest.eventIds.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-3 md:justify-end">
                  <span
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] ${guest.checkedInCount > 0 ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-orange-400/20 bg-orange-400/10 text-orange-300"}`}
                  >
                    {guest.checkedInCount > 0
                      ? `${guest.checkedInCount} arrived`
                      : "Awaiting"}
                  </span>
                  <span className="hidden text-right text-[10px] text-zinc-600 xl:block">
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(guest.lastActivityAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  accent = "text-violet-400",
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-zinc-500">{label}</p>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="mt-3 text-2xl font-black">{value.toLocaleString()}</p>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="animate-pulse divide-y divide-white/[0.05]">
      {[1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-3 px-5 py-4">
          <div className="h-11 w-11 rounded-2xl bg-white/[0.05]" />
          <div className="flex-1">
            <div className="h-3 w-40 rounded bg-white/[0.06]" />
            <div className="mt-2 h-2.5 w-56 rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getInitials(name: string, email: string) {
  return (name !== "Guest" ? name : email.split("@")[0] || "Guest")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
