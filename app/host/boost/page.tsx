"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import DynamicBoostCheckout from "@/components/host/DynamicBoostCheckout";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Sparkles,
  Ticket,
} from "lucide-react";

export default function BoostEventPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f8f7f5] px-4 py-12 text-zinc-950">
          <div className="mx-auto max-w-6xl animate-pulse rounded-[2rem] bg-white p-8 shadow-sm">
            <div className="h-8 w-48 rounded-lg bg-zinc-100" />
            <div className="mt-5 h-32 rounded-2xl bg-zinc-100" />
          </div>
        </main>
      }
    >
      <BoostEventContent />
    </Suspense>
  );
}

function BoostEventContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const event = useQuery(
    api.events.getById,
    eventId ? { eventId: eventId as Id<"events"> } : "skip",
  );
  const myEvents = useQuery(api.events.getMyEvents) || [];

  useEffect(() => {
    if (searchParams.get("boost") === "success") {
      setSuccessMessage("Payment submitted. Your promotion activates only after Stripe confirms payment.");
    } else if (searchParams.get("boost") === "cancelled") {
      setErrorMessage("Checkout was cancelled. No charge was made.");
    }
  }, [searchParams]);


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f7f5] text-zinc-950">
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pb-24 sm:pt-10">
        <Link
          href="/host"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Host dashboard
        </Link>

        <header className="relative mt-6 overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-orange-50 px-6 py-8 text-zinc-950 shadow-[0_12px_40px_rgba(24,16,40,0.08)] sm:mt-8 sm:px-10 sm:py-11">
          <div className="pointer-events-none absolute -right-10 -top-28 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="pointer-events-none absolute bottom-[-8rem] right-1/3 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-violet-800">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Function Hour · Host tools
              </p>
              <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                Give your event{" "}
                <span className="bg-gradient-to-r from-violet-700 via-fuchsia-700 to-orange-700 bg-clip-text text-transparent">
                  more spotlight.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-700 sm:text-base">
                Reach more people with featured placement across Function Hour discovery.
                Pick the boost that fits your event.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-orange-500 text-white">
                <Ticket className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-700">Simple checkout</p>
                <p className="mt-0.5 text-sm font-black">Secure payment with Stripe</p>
              </div>
            </div>
          </div>
        </header>

        {successMessage && (
          <div role="status" className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            <Check className="h-5 w-5 shrink-0" aria-hidden="true" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            {errorMessage}
          </div>
        )}

        {!eventId ? (
          <section className="mt-8 rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-[0_12px_40px_rgba(24,24,27,0.05)] sm:p-7">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">Step 1 · Choose your event</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">What are you promoting?</h2>
              </div>
              <p className="text-sm text-zinc-700">Choose an event to see boost options.</p>
            </div>
            {myEvents.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {myEvents.slice(0, 8).map((item) => (
                  <Link
                    key={item._id}
                    href={`/host/boost?eventId=${item._id}`}
                    className="group flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-[#fbfaf9] p-4 transition hover:border-violet-300 hover:bg-violet-50/60 hover:shadow-md"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-black text-zinc-950">{item.name || "Untitled event"}</span>
                      <span className="mt-1 block truncate text-sm text-zinc-700">{item.dateString || "Date pending"} · {item.location || "Location pending"}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-2 text-xs font-black text-white shadow-[0_4px_16px_rgba(124,58,237,0.2)] transition group-hover:from-violet-500 group-hover:to-fuchsia-500">
                      Select <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-[#fbfaf9] px-5 py-10 text-center">
                <Ticket className="mx-auto h-8 w-8 text-violet-500" aria-hidden="true" />
                <p className="mt-3 font-black">No events to boost yet</p>
                <p className="mt-1 text-sm text-zinc-700">Create an event first, then return here to promote it.</p>
                <Link href="/host/create" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 text-sm font-black text-white transition hover:from-violet-500 hover:to-fuchsia-500">
                  Create an event
                </Link>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mt-8 flex flex-col gap-4 rounded-[1.75rem] border border-violet-200 bg-white p-5 shadow-[0_12px_40px_rgba(24,24,27,0.05)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">Step 1 · Selected event</p>
                <h2 className="mt-2 truncate text-xl font-black sm:text-2xl">{event?.name || "Loading event…"}</h2>
                <p className="mt-1 text-sm text-zinc-700">{event?.dateString || "Date pending"} · {event?.location || "Location pending"}</p>
              </div>
              <Link href="/host/boost" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 transition hover:border-violet-300 hover:text-violet-700">
                Change event
              </Link>
            </section>

            <section className="mt-10">
              <DynamicBoostCheckout eventId={eventId as Id<"events">} />
            </section>

            <section className="mt-8 grid gap-3 rounded-[1.5rem] border border-zinc-200 bg-white p-5 sm:grid-cols-3 sm:p-6">
              {[
                ["01", "Choose your boost", "Compare the placement and duration."],
                ["02", "Secure checkout", "Complete payment with Stripe."],
                ["03", "Get discovered", "Your promotion goes live for your event."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-3 rounded-xl p-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-black text-violet-800">{number}</span>
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-zinc-700">{description}</p>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </section>
      <div className="h-16 sm:hidden" />
    </main>
  );
}

