"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import OrganizerPortalLink from "@/components/OrganizerPortalLink";

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-white" aria-label="Function Hour home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-fuchsia-600 text-xs font-black tracking-[-0.08em] shadow-[0_0_24px_rgba(249,115,22,0.28)]">
            FH
          </span>
          <span>Function<span className="bg-gradient-to-r from-orange-400 to-fuchsia-500 bg-clip-text text-transparent">Hour</span></span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/my-tickets" className="text-zinc-300 hover:text-white">My Tickets</Link>
          <OrganizerPortalLink
            organizerLabel="Create Event"
            attendeeLabel="Create Event"
            organizerHref="/host/create"
            className="text-zinc-300 hover:text-white"
          />

          <SignedOut>
            <SignInButton>
              <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl font-bold text-white">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
