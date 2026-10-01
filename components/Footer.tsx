import Link from "next/link";
import PrivacyPreferences from "@/components/privacy/PrivacyPreferences";

export default function Footer({ homePrivacyOptOut = false }: { homePrivacyOptOut?: boolean }) {
  return (
    <footer className={`${homePrivacyOptOut ? "mt-0" : "mt-20"} border-t border-zinc-200 bg-white`}>
      <div className="mx-auto grid max-w-7xl gap-9 px-6 py-10 text-left sm:grid-cols-[auto_1fr] sm:items-start">
        <div>
          <p className="font-black tracking-[0.2em] text-zinc-950">
            FUNCTION<span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">HOUR</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            © {new Date().getFullYear()} Function Hour. All rights reserved.
          </p>
        </div>
        <nav aria-label="Legal and support" className="flex flex-wrap content-start gap-x-6 gap-y-3 text-sm text-zinc-700">
          <Link href="/organizer/pricing" className="transition hover:text-zinc-950">Organizer pricing</Link>
          <a href="https://www.instagram.com/functionhour/" target="_blank" rel="noreferrer" aria-label="Function Hour on Instagram" className="transition hover:text-zinc-950">Instagram · @FunctionHour ↗</a>
          <a href="https://www.tiktok.com/@functionhour" target="_blank" rel="noreferrer" aria-label="Function Hour on TikTok" className="transition hover:text-zinc-950">TikTok · @FunctionHour ↗</a>
          <Link href="/refund-policy" className="transition hover:text-zinc-950">Refunds</Link>
          <Link href="/terms" className="transition hover:text-zinc-950">Terms</Link>
          <Link href="/privacy" className="transition hover:text-zinc-950">Privacy</Link>
          <a href="mailto:operations@functionhour.com?subject=Accessibility%20support" className="transition hover:text-zinc-950">Accessibility support</a>
          <PrivacyPreferences />
          <a href="mailto:operations@functionhour.com" className="transition hover:text-zinc-950">Support</a>
        </nav>
      </div>
    </footer>
  );
}
