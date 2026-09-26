"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import TicketWalletList from "@/components/tickets/TicketWalletList";

export default function MyTicketsPage() {
  const { user, isLoaded } = useUser();

  const tickets = useQuery(
    api.tickets.getUserTickets,
    user ? {} : "skip"
  );
  const profile = useQuery(
    api.users.getCurrentUser,
    user ? {} : "skip"
  );

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold">My Tickets</h1>

          <p className="mt-4 text-zinc-400">
            Sign in to view your tickets.
          </p>

          <div className="mt-6">
            <SignInButton mode="modal">
              <button className="rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200">
                Sign In
              </button>
            </SignInButton>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060c] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-16%] top-[-18%] h-[500px] w-[500px] rounded-full bg-violet-700/15 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-12%] h-[520px] w-[520px] rounded-full bg-orange-500/10 blur-[160px]" />
      </div>

      <section className="mx-auto max-w-5xl">
        <nav className="relative mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-5">
          <Link
            href="/events"
            className="text-sm font-black tracking-[-0.04em] text-white"
          >
            FUNCTION<span className="text-violet-400">HOUR</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/events"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-black text-zinc-300 hover:bg-white/[0.07]"
            >
              Explore
            </Link>
            <Link
              href="/my-orders"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-black text-zinc-300 hover:bg-white/[0.07]"
            >
              Orders
            </Link>
            <Link
              href="/saved-events"
              className="hidden min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-black text-zinc-300 hover:bg-white/[0.07] sm:inline-flex"
            >
              Saved
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </nav>

        <div className="relative mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Function Hour
            </p>

            <h1 className="mt-2 text-4xl font-bold">My Tickets</h1>

            <p className="mt-3 text-zinc-400">
              Tickets, entry details, and important event updates.
            </p>
          </div>
        </div>

        {profile && !profile.attendeeOnboardingComplete ? (
          <section className="relative mb-6 overflow-hidden rounded-[1.5rem] border border-violet-400/20 bg-gradient-to-r from-violet-600/15 via-white/[0.04] to-orange-500/10 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div className="absolute right-[-5%] top-[-80%] h-44 w-44 rounded-full bg-orange-500/15 blur-3xl" />
            <div className="relative">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-300">
                Optional setup
              </p>
              <h2 className="mt-2 text-xl font-black">
                Make Function Hour yours
              </h2>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Add your city and interests for better event recommendations.
              </p>
            </div>

            <Link
              href="/onboarding/attendee"
              className="relative mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-5 text-xs font-black text-black sm:mt-0 sm:w-auto"
            >
              Finish setup
            </Link>
          </section>
        ) : null}

        {tickets === undefined && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <p className="text-zinc-400">Loading tickets...</p>
          </div>
        )}

        {tickets && tickets.length === 0 && (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
            <h2 className="text-2xl font-semibold">No tickets yet</h2>

            <p className="mt-3 text-zinc-400">
              Browse events and claim your first ticket.
            </p>

            <Link
              href="/events"
              className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-zinc-200"
            >
              Browse Events
            </Link>
          </div>
        )}

        {tickets && tickets.length > 0 && (
          <TicketWalletList tickets={tickets} />
        )}
      </section>
    </main>
  );
}
