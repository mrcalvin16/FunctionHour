"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import OrganizerPortalLink from "@/components/OrganizerPortalLink";
import FollowingNavLink from "@/components/FollowingNavLink";

const browseLinks = [
  { href: "/events", label: "Events" },
  { href: "/cities", label: "Cities" },
  { href: "/map", label: "Map" },
];

const accountLinks = [
  { href: "/saved-events", label: "Saved" },
  { href: "/my-tickets", label: "My Tickets" },
  { href: "/my-orders", label: "Orders" },
  { href: "/my-event-passport", label: "Passport" },
  { href: "/my-merch-orders", label: "Merch Orders" },
];

const linkClass = "rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:text-zinc-950";
const activeLinkClass = "rounded-full border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-bold text-zinc-950 shadow-sm transition";

function isCurrentLink(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getLinkClass(pathname: string, href: string) {
  return isCurrentLink(pathname, href) ? activeLinkClass : linkClass;
}
const actionClass = "rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95";

export default function DiscoveryNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6" aria-label="Main navigation">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Function Hour home">
          <img src="/function-hour-mark.svg" alt="" aria-hidden="true" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
          <span className="text-lg font-black tracking-[-0.06em] sm:text-2xl"><span className="text-zinc-950">Function</span><span className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 bg-clip-text text-transparent">Hour</span></span>
        </Link>

        <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-2 lg:flex">
          {browseLinks.map(({ href, label }) => <Link key={href} href={href} aria-current={isCurrentLink(pathname, href) ? "page" : undefined} className={getLinkClass(pathname, href)}>{label}{href === "/my-event-passport" && <span className="ml-1.5 inline-block rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800">Beta</span>}</Link>)}
          <SignedIn>
            <FollowingNavLink className={linkClass} />
            {accountLinks.map(({ href, label }) => <Link key={href} href={href} aria-current={isCurrentLink(pathname, href) ? "page" : undefined} className={getLinkClass(pathname, href)}>{label}{href === "/my-event-passport" && <span className="ml-1.5 inline-block rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800">Beta</span>}</Link>)}
            <OrganizerPortalLink className={actionClass} />
          </SignedIn>
          <SignedOut>
            <OrganizerPortalLink className={actionClass} />
            <SignInButton mode="modal"><button data-cta="sign_in" type="button" className={linkClass}>Sign In</button></SignInButton>
          </SignedOut>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <button type="button" aria-label="Navigation menu" aria-expanded={menuOpen} aria-controls="discovery-mobile-menu" onClick={() => setMenuOpen((open) => !open)} className={linkClass}>
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <nav id="discovery-mobile-menu" aria-label="Mobile navigation" className="border-t border-zinc-200 bg-white px-4 py-4 lg:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 sm:grid-cols-3">
            {browseLinks.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={isCurrentLink(pathname, href) ? "page" : undefined} className={getLinkClass(pathname, href)}>{label}{href === "/my-event-passport" && <span className="ml-1.5 inline-block rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800">Beta</span>}</Link>)}
            <SignedIn>
              <FollowingNavLink className={linkClass} onClick={() => setMenuOpen(false)} />
              {accountLinks.map(({ href, label }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} aria-current={isCurrentLink(pathname, href) ? "page" : undefined} className={getLinkClass(pathname, href)}>{label}{href === "/my-event-passport" && <span className="ml-1.5 inline-block rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800">Beta</span>}</Link>)}
              <OrganizerPortalLink className={actionClass} />
            </SignedIn>
            <SignedOut>
              <OrganizerPortalLink className={actionClass} />
              <SignInButton mode="modal"><button data-cta="sign_in" type="button" className={linkClass}>Sign In</button></SignInButton>
            </SignedOut>
            <Link href="/organizer/pricing" onClick={() => setMenuOpen(false)} className={linkClass}>Organizer Pricing</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
