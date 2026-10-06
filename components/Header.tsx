"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import OrganizerPortalLink from "@/components/OrganizerPortalLink";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2" aria-label="Function Hour home">
          <img src="/function-hour-mark.svg" alt="" aria-hidden="true" className="h-9 w-9 object-contain" />
          <span className="text-xl font-black tracking-[-0.06em]"><span className="text-zinc-950">Function</span><span className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 bg-clip-text text-transparent">Hour</span></span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/my-tickets" className="text-zinc-700 hover:text-zinc-950">My Tickets</Link>
          <OrganizerPortalLink
            organizerLabel="Create Event"
            attendeeLabel="Create Event"
            organizerHref="/host/create"
            className="text-zinc-700 hover:text-zinc-950"
          />

          <SignedOut>
            <SignInButton>
              <button data-cta="sign_in" className="rounded-xl bg-violet-700 px-4 py-2 font-bold text-white hover:bg-violet-800">
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