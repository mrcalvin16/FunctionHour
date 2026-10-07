import Link from "next/link";
import { ArrowUpRight, Mail, ShieldCheck } from "lucide-react";
import DiscoveryNav from "@/components/DiscoveryNav";
import Footer from "@/components/Footer";

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-[#fffaf7] text-zinc-950">
      <DiscoveryNav />
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-7 sm:py-16 lg:px-8">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-900">
            <ShieldCheck className="h-4 w-4 text-orange-800" aria-hidden="true" />
            Access for everyone
          </p>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
            Accessibility at FunctionHour
          </h1>
          <p className="mt-5 text-base leading-7 text-zinc-700">
            FunctionHour is working to make discovering events, purchasing tickets, and managing event details usable for people with disabilities. We are improving the experience over time and welcome reports when something gets in the way.
          </p>
        </div>

        <div className="mt-9 grid gap-5 md:grid-cols-[1fr_0.8fr]">
          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black text-zinc-950">Our accessibility work</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              We use the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA as an engineering target for ongoing design, implementation, and testing. The site is still being improved; this statement is not a certification that every page or feature currently meets every WCAG criterion.
            </p>
            <p className="mt-4 text-sm leading-6 text-zinc-700">
              We are prioritizing keyboard access, clear focus indicators, screen-reader names and instructions, readable contrast, form errors, and accessible alternatives for visual experiences such as maps.
            </p>
            <h2 className="mt-7 text-xl font-black text-zinc-950">Need help using FunctionHour?</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              If a page, ticket, checkout step, or organizer tool is difficult to use, contact us. Tell us what you were trying to do and we will work with you on an accessible way to get the information or service you need.
            </p>
            <a
              href="mailto:support@functionhour.com?subject=Accessibility%20support"
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl border border-violet-300 bg-violet-100 px-5 text-sm font-bold text-violet-950 transition hover:border-violet-400 hover:bg-violet-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-900"
            >
              <Mail className="h-4 w-4 text-violet-900" aria-hidden="true" />
              Contact accessibility support
              <ArrowUpRight className="h-4 w-4 text-violet-900" aria-hidden="true" />
            </a>
          </article>

          <aside className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-pink-50 p-6 sm:p-8">
            <h2 className="text-xl font-black text-zinc-950">When you report an issue</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Helpful details include:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700 marker:text-orange-800">
              <li>The page address and the action you were trying to complete.</li>
              <li>Your browser, device, and assistive technology, if you know them.</li>
              <li>What happened and what you expected to happen.</li>
            </ul>
            <p className="mt-5 rounded-2xl border border-orange-200 bg-white/80 p-4 text-sm leading-6 text-zinc-800">
              Please do not email passwords, sign-in codes, full payment card details, or ticket QR codes.
            </p>
            <Link href="/events" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-900 underline decoration-violet-300 underline-offset-4 hover:text-violet-700">
              Browse events <ArrowUpRight className="h-4 w-4 text-violet-800" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
}
