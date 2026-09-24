import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleHelp,
  CreditCard,
  Megaphone,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Organizer pricing",
  description:
    "Explore Function Hour organizer pricing. Create events with no upfront listing fee and see ticket prices clearly at checkout.",
};

const included = [
  "Create and publish event listings",
  "Set ticket prices and available quantities",
  "Manage ticket orders and guest check-in",
  "Use organizer tools for promotion and event operations",
];

const steps = [
  {
    number: "01",
    title: "Create your event",
    description:
      "Build your listing, add ticket options, and share it with your audience.",
    icon: Ticket,
  },
  {
    number: "02",
    title: "Guests pay the listed price",
    description:
      "Checkout charges the ticket price you set. Function Hour currently adds no separate platform fee.",
    icon: CreditCard,
  },
  {
    number: "03",
    title: "Connect payouts",
    description:
      "Complete Stripe Connect setup to provide the required identity, business, and bank details.",
    icon: Wallet,
  },
];

const faqs = [
  {
    question: "Does Function Hour charge an upfront listing fee?",
    answer:
      "No. You can create and publish an event without an upfront listing charge.",
  },
  {
    question: "Is a Function Hour service fee added to ticket checkout?",
    answer:
      "The current ticket checkout charges the ticket price set by the organizer and does not add a separate Function Hour service fee. Any payment processing charges, if applicable, should be confirmed with Stripe before selling tickets.",
  },
  {
    question: "When do I receive ticket proceeds?",
    answer:
      "Organizer payouts require a completed Stripe Connect account. Function Hour's payout tools currently show tracking and account readiness; direct transfer routing is not yet enabled. Contact operations before relying on the platform to send ticket proceeds.",
  },
  {
    question: "Can I sell free tickets?",
    answer:
      "Event listings can be created with free admission. Paid ticket checkout is available for events with a ticket price.",
  },
];

export default function OrganizerPricingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07060c] px-4 pb-20 pt-10 text-white sm:px-6 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[-12%] top-[-9%] h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[150px]" />
        <div className="absolute right-[-10%] top-[18%] h-[380px] w-[380px] rounded-full bg-orange-500/15 blur-[150px]" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.3)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="Function Hour home" className="text-lg font-black tracking-[-0.06em]">
            FUNCTION<span className="bg-gradient-to-r from-violet-400 to-orange-400 bg-clip-text text-transparent">HOUR</span>
          </Link>
          <Link
            href="/host/create"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-xs font-black transition hover:border-violet-300/50 hover:bg-white/[0.08]"
          >
            Create Event <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="grid items-center gap-12 pb-16 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pb-24 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-violet-200">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              Straightforward organizer pricing
            </p>
            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.06em] sm:text-7xl">
              More time for
              <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-orange-300 bg-clip-text text-transparent">
                the function.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg">
              Get your event out there without an upfront listing fee. Set your ticket price, share your page, and keep the checkout clear for guests.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/host/create"
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-500 px-7 text-sm font-black shadow-[0_0_36px_rgba(139,92,246,0.25)] transition hover:brightness-110"
              >
                Start creating <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#pricing-details" className="inline-flex min-h-14 items-center rounded-full border border-white/10 px-7 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.05]">
                See how pricing works
              </a>
            </div>
            <p className="mt-4 text-xs text-zinc-600">No monthly plan required to publish an event.</p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-violet-500/20 to-orange-500/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111018]/95 p-6 shadow-2xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Your event</p>
                  <h2 className="mt-2 text-2xl font-black">A clean start.</h2>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">No upfront fee</span>
              </div>
              <div className="my-7 rounded-2xl border border-white/[0.07] bg-black/30 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Event listing</span>
                  <span className="font-bold text-white">$0</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4 text-sm">
                  <span className="text-zinc-400">Function Hour checkout fee</span>
                  <span className="font-bold text-white">$0</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-4 text-sm">
                  <span className="text-zinc-400">Ticket price you set</span>
                  <span className="font-black text-orange-300">Your choice</span>
                </div>
              </div>
              <p className="text-xs leading-5 text-zinc-500">
                Payment processor charges may apply. Confirm the applicable Stripe fees and payout timing before you publish paid tickets.
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-bold text-violet-200">
                <ShieldCheck className="h-4 w-4" /> Clear prices. No surprise platform add-ons.
              </div>
            </div>
          </div>
        </section>

        <section id="pricing-details" className="scroll-mt-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-400">What it costs</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Start at $0.</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Function Hour currently has no upfront event publishing charge and does not add a separate platform fee to ticket checkout.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <PriceCard
              eyebrow="Free to start"
              title="$0"
              subtitle="To create and publish an event"
              icon={Megaphone}
              points={included.slice(0, 2)}
            />
            <PriceCard
              eyebrow="Ticket checkout"
              title="Your price"
              subtitle="Guests are charged the ticket price you set"
              icon={CreditCard}
              points={["No separate Function Hour fee today", "Payment processing terms may apply"]}
              featured
            />
            <PriceCard
              eyebrow="Organizer payouts"
              title="Stripe Connect"
              subtitle="Set up a connected account to prepare for payouts"
              icon={Wallet}
              points={["Secure identity and bank onboarding", "Transfer routing is not yet enabled"]}
            />
          </div>
          <p className="mt-5 rounded-2xl border border-orange-400/15 bg-orange-400/[0.05] px-5 py-4 text-xs leading-6 text-zinc-400">
            <strong className="text-orange-200">Important for paid events:</strong> Function Hour’s payout dashboard does not currently confirm direct transfers to organizers. Please contact{" "}
            <a className="font-bold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white" href="mailto:operations@functionhour.com">operations@functionhour.com</a>{" "}
            before accepting paid ticket sales if you need to confirm how funds are handled.
          </p>
        </section>

        <section className="mt-20 grid gap-10 border-t border-white/[0.08] pt-14 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-300">The flow</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">From idea to doors open.</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">The tools to get your listing live and your team ready, in one place.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {steps.map(({ number, title, description, icon: Icon }) => (
              <article key={number} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-orange-300">{number}</span>
                  <Icon className="h-5 w-5 text-violet-300" />
                </div>
                <h3 className="mt-7 text-base font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-400">Good to know</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Pricing questions, answered.</h2>
            </div>
            <CircleHelp className="hidden h-8 w-8 text-violet-300 sm:block" />
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <h3 className="font-black">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-[2rem] border border-violet-300/15 bg-gradient-to-r from-violet-700/25 via-fuchsia-700/10 to-orange-500/15 p-7 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Your next move</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Ready to bring people together?</h2>
              <p className="mt-2 text-sm text-zinc-400">Create your organizer profile and start building your event.</p>
            </div>
            <Link href="/host/create" className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-black transition hover:bg-zinc-200">
              Create an event <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function PriceCard({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  points,
  featured = false,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: typeof Ticket;
  points: string[];
  featured?: boolean;
}) {
  return (
    <article className={[
      "rounded-[1.75rem] border p-6",
      featured
        ? "border-violet-300/30 bg-gradient-to-br from-violet-500/[0.12] to-orange-500/[0.06] shadow-[0_16px_60px_rgba(139,92,246,0.1)]"
        : "border-white/[0.08] bg-white/[0.025]",
    ].join(" ")}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{eyebrow}</p>
        <Icon className="h-5 w-5 text-orange-300" />
      </div>
      <p className="mt-7 text-3xl font-black tracking-tight">{title}</p>
      <p className="mt-2 min-h-10 text-sm leading-5 text-zinc-400">{subtitle}</p>
      <ul className="mt-5 space-y-3 border-t border-white/[0.08] pt-5">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-xs leading-5 text-zinc-400">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
