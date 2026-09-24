import Link from "next/link";
import PrivacyPreferences from "@/components/privacy/PrivacyPreferences";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-10 text-center sm:flex-row sm:text-left">
        <div>
          <p className="font-black tracking-[0.2em] text-zinc-950">
            FUNCTION<span className="text-violet-500">HOUR</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            © {new Date().getFullYear()} Function Hour. All rights reserved.
          </p>
        </div>
        <nav aria-label="Legal and support" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-zinc-600">
          <Link href="/organizer/pricing" className="transition hover:text-zinc-950">Organizer pricing</Link>
          <a href="https://www.instagram.com/functionhour/" target="_blank" rel="noreferrer" aria-label="Function Hour on Instagram" className="transition hover:text-zinc-950">Instagram · @FunctionHour ↗</a>
          <a href="https://www.tiktok.com/@functionhour" target="_blank" rel="noreferrer" aria-label="Function Hour on TikTok" className="transition hover:text-zinc-950">TikTok · @FunctionHour ↗</a>
          <Link href="/refund-policy" className="transition hover:text-zinc-950">Refunds</Link>
          <Link href="/terms" className="transition hover:text-zinc-950">Terms</Link>
          <Link href="/privacy" className="transition hover:text-zinc-950">Privacy</Link>
          <a href="https://www.eventbrite.com/l/accessibility/" target="_blank" rel="noreferrer" className="transition hover:text-zinc-950">Accessibility</a>
          <a href="https://www.eventbrite.com/help/en-us/articles/666792/eventbrite-cookie-policy/" target="_blank" rel="noreferrer" className="transition hover:text-zinc-950">Cookies</a>
          <PrivacyPreferences />
          <a href="mailto:support@functionhour.com" className="transition hover:text-zinc-950">Support</a>
        </nav>
      </div>
    </footer>
  );
}
