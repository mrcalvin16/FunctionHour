"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ArrowUpRight, Crown, Sparkles, Zap } from "lucide-react";

export default function BoostEventPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950 dark:bg-zinc-950 dark:text-white sm:p-10">
          Loading Boost Center... <div className="h-12 sm:hidden" />
          <div className="h-12 sm:hidden" />
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
  const [isBoosting, setIsBoosting] = useState(false);

  const event = useQuery(
    api.events.getById,
    eventId ? { eventId: eventId as Id<"events"> } : "skip",
  );

  const myEvents = useQuery(api.events.getMyEvents) || [];

  useEffect(() => {
    if (searchParams.get("boost") === "success")
      setSuccessMessage(
        "Boost payment confirmed. Your event promotion is activating now.",
      );
    if (searchParams.get("boost") === "cancelled")
      setErrorMessage("Boost checkout was cancelled. No charge was made.");
  }, [searchParams]);

  async function handleBoost(tier: string) {
    if (!eventId || isBoosting) return;

    setIsBoosting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/boost/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          tier,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Checkout failed.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Failed to start checkout:", error);
      setErrorMessage("Unable to start boost checkout. Please try again.");
      setIsBoosting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/host"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 shadow-sm transition hover:border-zinc-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-white/30"
        >
          ← Back to Host Command Center
        </Link>

        <div className="relative mt-6 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_80px_rgba(24,24,27,0.08)] dark:border-white/10 dark:bg-zinc-900/70 dark:shadow-2xl sm:mt-8 sm:p-8">\n          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-500/15" />\n          <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-orange-800 dark:border-orange-300/20 dark:bg-orange-500/10 dark:text-orange-200">\n            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Function Hour Growth
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-zinc-950 dark:text-white sm:text-6xl">
            Boost Event
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Promote your event across discovery, featured placements, and
            premium surfaces.
          </p>

          {successMessage && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
              {errorMessage}
            </div>
          )}

          {!eventId ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-100">
              Choose an event below to compare promotion options. You’ll review the selection before checkout.
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-300/20 dark:bg-orange-500/10 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-800 dark:text-orange-200">
                Selected Event
              </p>

              <h2 className="mt-2 text-xl sm:text-2xl font-black">
                {event?.name || "Loading event..."}
              </h2>

              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {event?.dateString || "Date pending"} ·{" "}
                {event?.location || "Location pending"}
              </p>
            </div>
          )}
        </div>

        {!eventId && myEvents.length > 0 && (
          <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/70 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-300">
              Choose Event
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Select an event to boost
            </h2>

            <div className="mt-6 grid gap-3">
              {myEvents.slice(0, 8).map((event) => (
                <Link
                  key={event._id}
                  href={`/host/boost?eventId=${event._id}`}
                  className="flex min-h-[76px] flex-col items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-orange-300 hover:bg-orange-50 dark:border-white/10 dark:bg-white/[0.035] dark:hover:border-orange-400/50 dark:hover:bg-orange-500/10 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-black text-zinc-950 dark:text-white">
                      {event.name || "Untitled Event"}
                    </p>

                    <p className="mt-1 line-clamp-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {event.dateString || "Date pending"} ·{" "}
                      {event.location || "Location pending"}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-full bg-orange-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-black">
                    Boost
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          <BoostPlan
            title="Spotlight"
            price="$15"
            desc="24-hour discovery boost."
            disabled={!eventId || isBoosting}
            onSelect={() => handleBoost("spotlight")}
          />

          <BoostPlan
            title="Weekend Push"
            price="$35"
            desc="3-day featured boost."
            featured
            disabled={!eventId || isBoosting}
            onSelect={() => handleBoost("weekend_push")}
          />

          <BoostPlan
            title="City Takeover"
            price="$75"
            desc="7-day premium placement."
            disabled={!eventId || isBoosting}
            onSelect={() => handleBoost("city_takeover")}
          />
        </div>

        <div className="mt-8 grid gap-3 rounded-[1.75rem] border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-3 sm:p-6">
          {[
            ["01", "Choose an event", "Select the event you want to promote."],
            ["02", "Pick a duration", "Compare the placement period and price."],
            ["03", "Review checkout", "Confirm the boost before paying."],
          ].map(([number, title, description]) => (
            <div key={number} className="flex gap-3 rounded-2xl p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-100 text-xs font-black text-orange-800 dark:bg-orange-500/15 dark:text-orange-200">{number}</span>
              <div>
                <p className="font-bold text-zinc-950 dark:text-white">{title}</p>
                <p className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="h-16 sm:hidden" />
    </main>
  );
}

function BoostPlan({
  title,
  price,
  desc,
  featured = false,
  disabled = false,
  onSelect,
}: {
  title: string;
  price: string;
  desc: string;
  featured?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const PlanIcon = title === "Spotlight" ? Sparkles : title === "Weekend Push" ? Zap : Crown;

  return (
    <div
      className={
        featured
          ? "relative rounded-[1.75rem] border border-orange-300 bg-white p-6 shadow-[0_24px_60px_rgba(249,115,22,0.12)] ring-1 ring-orange-200 dark:border-orange-300/40 dark:bg-orange-500/[0.08] dark:shadow-none dark:ring-0 sm:p-7"
          : "rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.035] sm:p-7"
      }
    >
      {featured ? (
        <span className="absolute right-5 top-5 rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-900 dark:bg-orange-400/20 dark:text-orange-100">
          Popular
        </span>
      ) : null}
      <span className={featured ? "grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200" : "grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-800 dark:bg-white/10 dark:text-zinc-200"}>
        <PlanIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-orange-800 dark:text-orange-200">
        {title}
      </p>
      <p className="mt-3 text-4xl font-black tracking-tight text-zinc-950 dark:text-white">{price}</p>
      <p className="mt-3 min-h-10 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{desc}</p>

      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={
          disabled
            ? "mt-7 w-full cursor-not-allowed rounded-2xl bg-zinc-200 px-5 py-4 text-sm font-black text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
            : featured
              ? "mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-black transition hover:bg-orange-400"
              : "mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-4 text-sm font-black text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        }
      >
        {disabled ? "Select an event first" : isBoosting ? "Opening checkout..." : <>Continue to checkout <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></>}
      </button>
    </div>
  );
}
