import type { Metadata } from "next";
import Link from "next/link";
import OrganizerPortalLink from "@/components/OrganizerPortalLink";
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Check,
  CreditCard,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Organizer pricing",
  description:
    "Clear, competitive pricing for event organizers. No monthly subscription. A competitive 2.1% + $0.99 fee on each paid ticket.",
};

const features = [
  "Create and publish events",
  "Unlimited ticket types and quantities",
  "Event promotion and discovery tools",
  "Guest lists, check-in, and organizer dashboard",
];

const comparisons = [
  {
    name: "Function Hour",
    platformFee: "2.1% + $0.99",
    note: "Per paid ticket. Card processing applies to the payment account.",
    featured: true,
  },
  {
    name: "Eventbrite",
    platformFee: "3.7% + $1.79",
    note: "Service fee per paid ticket, plus 2.9% processing",
    featured: false,
  },
  {
    name: "Humanitix",
    platformFee: "2.1% + $0.99",
    note: "Standard U.S. booking fee per paid ticket, plus processing",
    featured: false,
  },
];

const faqs = [
  {
    question: "Is there a monthly subscription?",
    answer:
      "No. There is no monthly Function Hour organizer subscription to create or publish an event.",
  },
  {
    question: "What is Function Hour’s ticket fee?",
    answer:
      "Function Hour charges 2.1% + $0.99 per paid ticket. This buyer-paid fee is itemized in checkout; free tickets have no service fee.",
  },
  {
    question: "What about card processing?",
    answer:
      "Stripe card-processing costs apply to the payment account separately from Function Hour’s service fee. The checkout total shows the ticket price and Function Hour fee before payment.",
  },
  {
    question: "Are organizer payouts ready?",
    answer:
      "Stripe Connect onboarding is available, but direct transfers to organizer accounts are not yet enabled. Contact Operations before accepting paid orders if you need payout confirmation.",
  },
];

export default function OrganizerPricingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#08070d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-48 -top-48 h-[600px] w-[600px] rounded-full bg-violet-700/20 blur-[180px]" />
        <div className="absolute -right-48 top-[24rem] h-[600px] w-[600px] rounded-full bg-orange-500/[0.12] blur-[180px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <header className="flex h-[76px] items-center justify-between border-b border-white/[0.08]">
          <Link href="/" aria-label="Function Hour home" className="text-[15px] font-black tracking-[-0.06em]">
            FUNCTION<span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">HOUR</span>
          </Link>
          <OrganizerPortalLink className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-bold text-zinc-200 transition hover:border-white/40 hover:bg-white/[0.05]" />
        </header>

        <section className="grid gap-12 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1fr_.82fr] lg:items-center lg:gap-20 lg:pb-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-300/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
              <Sparkles className="h-3.5 w-3.5" /> Organizer pricing
            </div>
            <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[.98] tracking-[-0.065em] sm:text-7xl">
              Keep more of
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-orange-300 bg-clip-text text-transparent">
                your ticket sales.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              No subscription. One clear service fee on each paid ticket, shown before checkout.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <OrganizerPortalLink attendeeLabel="Start your event" organizerLabel="Open Organizer OS" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-black transition hover:bg-zinc-200" />
              <a href="#compare" className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-bold text-zinc-400 transition hover:text-white">
                Compare fees <ArrowDownRight className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> No monthly subscription</span>
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> 2.1% + $0.99 fee</span>
              <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-400" /> Free events stay free</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-500/25 to-orange-400/15 blur-2xl" />
            <div className="relative rounded-[1.75rem] border border-white/[0.12] bg-[#111019]/95 p-6 shadow-2xl shadow-black/50 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Function Hour launch pricing</p>
                  <h2 className="mt-3 text-4xl font-black tracking-tight">Simple pricing<span className="text-violet-300">.</span></h2>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-200">
                  <Ticket className="h-5 w-5" />
                </span>
              </div>

              <div className="mt-7 rounded-2xl border border-white/[0.08] bg-black/35 p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-zinc-400">Function Hour service fee</p>
                    <p className="mt-1 text-[11px] text-zinc-600">Per paid ticket</p>
                  </div>
                  <p className="text-3xl font-black tracking-tight">2.1% + $0.99</p>
                </div>
                <div className="my-4 h-px bg-white/[0.08]" />
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-500">Monthly subscription</span>
                  <span className="font-black text-white">None</span>
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-white/[0.08] pt-5 text-[11px] leading-5 text-zinc-500">
                Example: a $20 ticket has a $1.41 Function Hour service fee, for a $21.41 total before any applicable taxes.
              </p>
            </div>
          </div>
        </section>

        <section id="compare" className="scroll-mt-8 border-t border-white/[0.08] py-16 sm:py-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">A clear difference</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Compare platform fees.</h2>
            </div>
            <p className="max-w-md text-xs leading-5 text-zinc-500">
              Published U.S. platform fees for paid tickets. Payment processing is separate; rates may change.
            </p>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {comparisons.map((item) => (
              <article key={item.name} className={[
                "relative rounded-2xl border p-5 sm:p-6",
                item.featured
                  ? "border-violet-300/35 bg-gradient-to-br from-violet-500/[0.13] via-white/[0.04] to-orange-500/[0.08] shadow-[0_20px_60px_rgba(124,58,237,0.12)]"
                  : "border-white/[0.09] bg-white/[0.025]",
              ].join(" ")}>
                {item.featured && <span className="absolute right-4 top-4 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-200">Launch offer</span>}
                <p className="text-xs font-bold text-zinc-400">{item.name}</p>
                <p className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">{item.platformFee}</p>
                <p className="mt-2 min-h-10 text-xs leading-5 text-zinc-500">{item.note}</p>
                {item.featured ? (
                  <p className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-violet-200"><BadgeCheck className="h-4 w-4" /> Competitive fee</p>
                ) : (
                  <p className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-600"><CreditCard className="h-4 w-4" /> Payment processing additional</p>
                )}
              </article>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-5 text-zinc-600">
            Competitor prices are based on their publicly listed U.S. standard rates checked September 2026:{" "}
            <a href="https://www.eventbrite.com/organizer/pricing/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-zinc-400">Eventbrite</a>
            {" "}and{" "}
            <a href="https://humanitix.com/us/pricing" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-zinc-400">Humanitix</a>.
          </p>
        </section>

        <section className="grid gap-4 border-t border-white/[0.08] py-14 md:grid-cols-[1fr_1.15fr]">
          <div className="rounded-2xl border border-orange-300/20 bg-orange-300/[0.055] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-orange-200">
              <Wallet className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em]">Payout status</p>
            </div>
            <h2 className="mt-4 text-xl font-black">Know before you sell.</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Stripe Connect onboarding is available, but direct payouts to organizers are not yet enabled. Contact Operations before accepting paid orders if you need to confirm fund handling.
            </p>
            <a href="mailto:operations@functionhour.com" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-orange-200 hover:text-white">
              Contact Operations <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">The short version</p>
            <h2 className="mt-4 text-xl font-black">Good tools. Clear costs.</h2>
            <div className="mt-5 grid gap-x-5 gap-y-3 sm:grid-cols-2">
              {[
                "No monthly fee",
                "No upfront listing fee",
                "2.1% + $0.99 per paid ticket",
                "Free tickets have no service fee",
              ].map((line) => (
                <p key={line} className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                  <Check className="h-4 w-4 text-emerald-400" /> {line}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.08] py-14">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">FAQ</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">The details, simply.</h2>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <h3 className="text-sm font-black">{faq.question}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-5 rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-violet-600/20 via-fuchsia-500/10 to-orange-500/15 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">Bring your people together</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Your next event starts here.</h2>
          </div>
          <OrganizerPortalLink className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-black transition hover:bg-zinc-200" />
        </section>
      </div>
    </main>
  );
}
