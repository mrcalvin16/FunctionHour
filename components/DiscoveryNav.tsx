"use client";

import { useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import OrganizerPortalLink from "@/components/OrganizerPortalLink";

const browseLinks = [
  { href: "/events", label: "Events" },
  { href: "/cities", label: "Cities" },
  { href: "/map", label: "Map" },
];

const accountLinks = [
  { href: "/saved-events", label: "Saved" },
  { href: "/my-tickets", label: "My Tickets" },
  { href: "/my-merch-orders", label: "Merch Orders" },
];

const linkClass = "rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950";
const actionClass = "rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95";

export default function DiscoveryNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6" aria-label="Main navigation">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-[0.02em] sm:text-2xl" aria-label="Function Hour home">
          <span className="text-zinc-950">FUNCTION</span><span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">HOUR</span>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {browseLinks.map(({ href, label }) => <Link key={href} href={href} className={linkClass}>{label}</Link>)}
          <SignedIn>
            {accountLinks.map(({ href, label }) => <Link key={href} href={href} className={linkClass}>{label}</Link>)}
            <OrganizerPortalLink className={actionClass} />
          </SignedIn>
          <SignedOut>
            <OrganizerPortalLink className={actionClass} />
            <SignInButton mode="modal"><button type="button" className={linkClass}>Sign In</button></SignInButton>
          </SignedOut>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <button type="button" aria-label="Navigation menu" aria-expanded={menuOpen} aria-controls="discovery-mobile-menu" onClick={() => setMenuOpen((open) => !open)} className={linkClass}>
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <nav id="discovery-mobile-menu" aria-label="Mobile navigation" className="border-t border-zinc-200 bg-white px-4 py-4 lg:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-3">
            {browseLinks.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={linkClass}>{label}</Link>)}
            <SignedIn>
              {accountLinks.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={linkClass}>{label}</Link>)}
              <OrganizerPortalLink className={actionClass} />
            </SignedIn>
            <SignedOut>
              <OrganizerPortalLink className={actionClass} />
              <SignInButton mode="modal"><button type="button" className={linkClass}>Sign In</button></SignInButton>
            </SignedOut>
            <Link href="/organizer/pricing" onClick={() => setMenuOpen(false)} className={linkClass}>Organizer Pricing</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
