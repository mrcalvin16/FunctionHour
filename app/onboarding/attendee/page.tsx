"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Bell,
  Check,
  MapPin,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { api } from "@/convex/_generated/api";

const interestOptions = [
  { value: "music", label: "Music" },
  { value: "nightlife", label: "Nightlife" },
  { value: "festivals", label: "Festivals" },
  { value: "food", label: "Food" },
  { value: "sports", label: "Sports" },
  { value: "networking", label: "Networking" },
  { value: "community", label: "Community" },
  { value: "arts", label: "Arts" },
] as const;

type Interest = (typeof interestOptions)[number]["value"];
type NotificationPreference = "essential" | "email";

export default function AttendeeOnboardingPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const profile = useQuery(
    api.users.getCurrentUser,
    isLoaded && isSignedIn ? {} : "skip"
  );
  const completeOnboarding = useMutation(
    api.users.completeAttendeeOnboarding
  );

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [interests, setInterests] = useState<Interest[]>([]);
  const [notificationPreference, setNotificationPreference] =
    useState<NotificationPreference>("essential");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!profile || initialized) {
      return;
    }

    setName(
      profile.name?.trim() ||
        user?.fullName?.trim() ||
        ""
    );
    setCity(profile.city ?? "");
    setInterests(
      (profile.interests ?? []).filter(
        (interest): interest is Interest =>
          interestOptions.some(
            (option) => option.value === interest
          )
      )
    );
    setNotificationPreference(
      profile.notificationPreference === "email"
        ? "email"
        : "essential"
    );
    setInitialized(true);
  }, [initialized, profile, user?.fullName]);

  useEffect(() => {
    if (profile?.attendeeOnboardingComplete) {
      router.replace("/my-tickets");
    }
  }, [profile?.attendeeOnboardingComplete, router]);

  function toggleInterest(interest: Interest) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  async function handleComplete() {
    setMessage("");

    if (!name.trim()) {
      setMessage("Enter your name to continue.");
      return;
    }

    try {
      setSaving(true);

      await completeOnboarding({
        name: name.trim(),
        city: city.trim() || undefined,
        interests,
        notificationPreference,
      });

      router.replace("/my-tickets?onboarding=complete");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not save your attendee profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded) {
    return <AttendeeLoading />;
  }

  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07060c] px-5 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/40">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-700">
            <TicketCheck className="h-6 w-6" />
          </span>

          <h1 className="mt-6 text-3xl font-black">
            Keep your tickets together
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Sign in to finish your attendee setup and access every Function Hour ticket from one place.
          </p>

          <SignInButton mode="modal">
            <button className="mt-7 min-h-12 w-full rounded-xl bg-white px-5 text-sm font-black text-black">
              Sign in to continue
            </button>
          </SignInButton>

          <Link
            href="/events"
            className="mt-4 inline-flex min-h-11 items-center text-xs font-black text-zinc-500 hover:text-white"
          >
            Browse events instead
          </Link>
        </section>
      </main>
    );
  }

  if (profile === undefined || profile?.attendeeOnboardingComplete) {
    return <AttendeeLoading />;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060c] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-15%] top-[-18%] h-[520px] w-[520px] rounded-full bg-violet-700/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[560px] w-[560px] rounded-full bg-orange-500/15 blur-[160px]" />
      </div>

      <section className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[2rem] border border-white/[0.09] bg-[#0d0b16]/90 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-800">
                Attendee Setup
              </p>
              <p className="mt-2 text-xs font-bold text-zinc-600">
                About 30 seconds
              </p>
            </div>

            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
              Ticket ready
            </span>
          </div>

          <h1 className="mt-7 text-3xl font-black tracking-[-0.03em] sm:text-5xl">
            Let’s personalize your crowd.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Your ticket is secure. These optional details help Function Hour show you better events and send the updates that matter.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black text-zinc-300">
                Your name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Full name"
                className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black text-zinc-300">
                Your city <span className="text-zinc-600">(optional)</span>
              </span>
              <span className="relative mt-2 block">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  autoComplete="address-level2"
                  placeholder="New Orleans"
                  className="min-h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 text-sm outline-none transition placeholder:text-zinc-700 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10"
                />
              </span>
            </label>
          </div>

          <div className="mt-8">
            <p className="text-xs font-black text-zinc-300">
              What are you into? <span className="text-zinc-600">(optional)</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2.5">
              {interestOptions.map((option) => {
                const selected = interests.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(option.value)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-black transition ${
                      selected
                        ? "border-violet-400/50 bg-violet-500/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-zinc-500 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-xs font-black text-zinc-300">
              Event updates
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PreferenceCard
                selected={notificationPreference === "essential"}
                title="Essential only"
                detail="Changes, cancellations, and entry information."
                onClick={() => setNotificationPreference("essential")}
              />
              <PreferenceCard
                selected={notificationPreference === "email"}
                title="Email updates"
                detail="Essential alerts plus relevant event recommendations."
                onClick={() => setNotificationPreference("email")}
              />
            </div>
          </div>

          {message ? (
            <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {message}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving || !name.trim()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 px-6 text-sm font-black shadow-[0_0_30px_rgba(124,58,237,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : "Continue to My Tickets"}
              {!saving ? <ArrowRight className="h-4 w-4" /> : null}
            </button>

            <Link
              href="/my-tickets"
              className="inline-flex min-h-12 items-center justify-center px-5 text-xs font-black text-zinc-500 transition hover:text-white"
            >
              Skip for now
            </Link>
          </div>
        </div>

        <aside className="h-fit rounded-[2rem] border border-white/[0.09] bg-gradient-to-br from-violet-600/15 via-white/[0.04] to-orange-500/10 p-6 shadow-2xl shadow-black/30 lg:sticky lg:top-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 text-orange-800">
            <Sparkles className="h-5 w-5" />
          </span>

          <h2 className="mt-6 text-2xl font-black">
            Your attendee home
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            My Tickets keeps everything you need before, during, and after the event in one place.
          </p>

          <div className="mt-6 space-y-3">
            {[
              "Upcoming tickets and entry status",
              "Venue rules and event updates",
              "Directions and event-day details",
              "Verified post-event ratings",
            ].map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 text-xs text-zinc-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-700">
                  <Check className="h-3 w-3" />
                </span>
                <span className="leading-5">{benefit}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function PreferenceCard({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-[96px] items-start gap-3 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-orange-400/40 bg-orange-400/10"
          : "border-white/10 bg-black/25 hover:border-white/20"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          selected
            ? "border-orange-400/30 bg-orange-400/10 text-orange-800"
            : "border-white/10 bg-white/[0.03] text-zinc-600"
        }`}
      >
        <Bell className="h-4 w-4" />
      </span>

      <span>
        <span className="block text-xs font-black text-white">{title}</span>
        <span className="mt-1 block text-[10px] leading-4 text-zinc-500">
          {detail}
        </span>
      </span>
    </button>
  );
}

function AttendeeLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07060c] px-5 text-white">
      <div className="text-center">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
        <p className="mt-4 text-sm font-bold text-zinc-500">
          Preparing your attendee profile...
        </p>
      </div>
    </main>
  );
}
