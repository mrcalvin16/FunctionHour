import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Sparkles,
  Ticket,
} from "lucide-react";

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060c] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-16%] top-[-18%] h-[520px] w-[520px] rounded-full bg-violet-700/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-12%] h-[560px] w-[560px] rounded-full bg-orange-500/15 blur-[160px]" />
      </div>

      <section className="relative mx-auto max-w-5xl">
        <Link
          href="/events"
          className="inline-flex min-h-11 items-center text-xs font-black uppercase tracking-[0.2em] text-zinc-500 transition hover:text-white"
        >
          ← Keep exploring
        </Link>

        <div className="mt-10 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-800">
            Welcome to Function Hour
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">
            How will you use Function Hour?
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            Keep your attendee experience simple, or open the full Organizer OS when you are ready to host.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <Link
            href="/onboarding/attendee"
            className="group relative overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-100 p-6 shadow-xl shadow-violet-950/10 transition hover:-translate-y-1 hover:border-violet-400 sm:p-8"
          >
            <div className="absolute right-[-15%] top-[-20%] h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300 bg-violet-100 text-violet-700">
              <Ticket className="h-6 w-6" />
            </span>

            <p className="relative mt-7 text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
              Attendee Mode
            </p>

            <h2 className="relative mt-2 text-3xl font-black">
              I’m here for events
            </h2>

            <p className="relative mt-3 max-w-md text-sm leading-6 text-zinc-400">
              Manage tickets, save events, receive important updates, and discover the right crowd.
            </p>

            <span className="onboarding-attendee-action relative mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl border border-violet-200 bg-white px-5 text-sm font-black text-zinc-950">
              Set up attendee profile
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/host/profile"
            className="group relative overflow-hidden rounded-[2rem] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-100 p-6 shadow-xl shadow-orange-950/10 transition hover:-translate-y-1 hover:border-orange-400 sm:p-8"
          >
            <div className="absolute right-[-15%] top-[-20%] h-48 w-48 rounded-full bg-orange-500/15 blur-3xl" />

            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-300 bg-orange-100 text-orange-800">
              <CalendarDays className="h-6 w-6" />
            </span>

            <p className="relative mt-7 text-[10px] font-black uppercase tracking-[0.22em] text-orange-800">
              Organizer Mode
            </p>

            <h2 className="relative mt-2 text-3xl font-black">
              I’m hosting events
            </h2>

            <p className="relative mt-3 max-w-md text-sm leading-6 text-zinc-400">
              Create events, sell tickets, manage check-in, build campaigns, and run your operation.
            </p>

            <span className="onboarding-action relative mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-black text-white">
              Open Organizer OS
              <Sparkles className="h-4 w-4 transition group-hover:rotate-6" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
