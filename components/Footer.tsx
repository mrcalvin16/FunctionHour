import Link from "next/link";
import PrivacyPreferences from "@/components/privacy/PrivacyPreferences";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-black">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-10 text-center sm:flex-row sm:text-left">
        <div>
          <p className="font-black tracking-[0.2em] text-white">
            FUNCTION<span className="text-violet-500">HOUR</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            © {new Date().getFullYear()} Function Hour. All rights reserved.
          </p>
        </div>
        <nav aria-label="Legal and support" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-zinc-400">
          <Link href="/organizer/pricing" className="hover:text-white">Organizer pricing</Link>
          <a href="https://www.instagram.com/functionhour/" target="_blank" rel="noreferrer" aria-label="Function Hour on Instagram" className="hover:text-white">Instagram · @FunctionHour ↗</a>
          <a href="https://www.tiktok.com/@functionhour" target="_blank" rel="noreferrer" aria-label="Function Hour on TikTok" className="hover:text-white">TikTok · @FunctionHour ↗</a>
          <Link href="/refund-policy" className="hover:text-white">Refunds</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <a href="https://www.eventbrite.com/l/accessibility/" target="_blank" rel="noreferrer" className="hover:text-white">Accessibility</a>
          <a href="https://www.eventbrite.com/help/en-us/articles/666792/eventbrite-cookie-policy/" target="_blank" rel="noreferrer" className="hover:text-white">Cookies</a>
          <PrivacyPreferences />
          <a href="mailto:support@functionhour.com" className="hover:text-white">Support</a>
        </nav>
      </div>
    </footer>
  );
}
