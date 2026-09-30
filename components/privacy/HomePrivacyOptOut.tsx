"use client";

import { useEffect, useState } from "react";
import {
  getPrivacyPreferences,
  savePrivacyPreferences,
} from "@/lib/privacyPreferences";

export default function HomePrivacyOptOut() {
  const [optedOut, setOptedOut] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setOptedOut(getPrivacyPreferences().doNotSellOrShare);
  }, []);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const current = getPrivacyPreferences();
      savePrivacyPreferences({
        ...current,
        analytics: optedOut ? false : current.analytics,
        doNotSellOrShare: optedOut,
      });
      setMessage("Your choice is saved in this browser.");
    } catch {
      setMessage("We could not save your choice. Please check browser storage settings and try again.");
    }
  }

  return (
    <section aria-labelledby="home-privacy-title" className="mx-auto max-w-7xl border-b border-zinc-200 px-6 py-8">
      <form onSubmit={save}>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">Your data, your choice</p>
        <h2 id="home-privacy-title" className="mt-2 text-xl font-black text-zinc-950">Opt out of optional data sharing</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
          Check the box to turn off optional event-view analytics in this browser. Essential account, ticket, payment, and security processing will continue.
        </p>
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-semibold text-zinc-950">
          <input
            type="checkbox"
            checked={optedOut}
            onChange={(event) => { setOptedOut(event.target.checked); setMessage(""); }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-violet-700"
          />
          Do not sell or share my personal information
        </label>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="submit" className="min-h-11 rounded-full bg-zinc-950 px-6 text-sm font-black text-white hover:bg-zinc-800">
            Save my choice
          </button>
          <p role="status" className="text-sm font-semibold text-zinc-700">{message}</p>
        </div>
        <p className="mt-4 max-w-2xl text-xs leading-5 text-zinc-600">
          This browser choice affects future optional analytics here. For an account-level data request, see our <a href="/privacy" className="font-bold text-violet-700 underline underline-offset-2">Privacy Policy</a>.
        </p>
      </form>
    </section>
  );
}
