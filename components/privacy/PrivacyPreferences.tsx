"use client";

import { useEffect, useRef, useState } from "react";
import {
  defaultPrivacyPreferences,
  getPrivacyPreferences,
  savePrivacyPreferences,
  type PrivacyPreferences as PreferenceValues,
} from "@/lib/privacyPreferences";

type DialogMode = "manage" | "opt-out";

const linkClassName = "cursor-pointer border-0 bg-transparent p-0 text-left text-zinc-400 transition hover:text-white";

export default function PrivacyPreferences() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("manage");
  const [preferences, setPreferences] = useState<PreferenceValues>(defaultPrivacyPreferences);
  const [savedMessage, setSavedMessage] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function showPreferences(nextMode: DialogMode) {
    setMode(nextMode);
    setPreferences(
      nextMode === "opt-out"
        ? { analytics: false, doNotSellOrShare: true }
        : getPrivacyPreferences(),
    );
    setSavedMessage("");
    setOpen(true);
  }

  function save() {
    savePrivacyPreferences(preferences);
    setSavedMessage(
      mode === "opt-out"
        ? "Your opt-out is saved for this browser. Future event-view analytics are disabled here."
        : "Your privacy preferences are saved for this browser.",
    );
    setOpen(false);
  }

  return (
    <>
      <button type="button" className={linkClassName} onClick={() => showPreferences("manage")}>
        Manage Cookie Preferences
      </button>
      <button type="button" className={linkClassName} onClick={() => showPreferences("opt-out")}>
        Do Not Sell or Share My Personal Information
      </button>
      {savedMessage && (
        <span role="status" className="sr-only">{savedMessage}</span>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-preferences-title"
            aria-describedby="privacy-preferences-description"
            tabIndex={-1}
            className="my-auto w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-6 text-white shadow-2xl outline-none sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                  Privacy controls
                </p>
                <h2 id="privacy-preferences-title" className="mt-2 text-2xl font-black">
                  {mode === "opt-out" ? "Opt out of sale or sharing" : "Manage your preferences"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Close privacy preferences"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <p id="privacy-preferences-description" className="mt-4 text-sm leading-6 text-zinc-300">
              Choose how Function Hour uses optional event-view analytics in this browser. Essential account, ticketing, payment, fraud-prevention, and security functions remain on.
            </p>

            <div className="mt-6 space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  disabled={preferences.doNotSellOrShare}
                  onChange={(event) =>
                    setPreferences((current) => ({ ...current, analytics: event.target.checked }))
                  }
                  className="mt-1 h-4 w-4 accent-violet-500"
                />
                <span>
                  <span className="block font-bold">Optional event-view analytics</span>
                  <span className="mt-1 block text-sm leading-5 text-zinc-400">
                    Allow event-page views to be included in organizer traffic reports.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <input
                  type="checkbox"
                  checked={preferences.doNotSellOrShare}
                  onChange={(event) =>
                    setPreferences((current) => ({
                      analytics: event.target.checked ? false : current.analytics,
                      doNotSellOrShare: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-violet-500"
                />
                <span>
                  <span className="block font-bold">Do not sell or share my personal information</span>
                  <span className="mt-1 block text-sm leading-5 text-zinc-400">
                    Save this choice in this browser and turn off optional event-view analytics here.
                  </span>
                </span>
              </label>
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              This browser setting stops future event-view analytics here; it does not remove data already recorded or submit an account-level request. To request access to or deletion of account information, email{" "}
              <a
                href="mailto:support@functionhour.com?subject=Personal%20information%20privacy%20request"
                className="font-semibold text-orange-300 underline underline-offset-2 hover:text-orange-200"
              >
                support@functionhour.com
              </a>.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-zinc-200 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-full bg-gradient-to-r from-violet-500 to-orange-500 px-5 py-3 text-sm font-black text-white hover:brightness-110"
              >
                Save preferences
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
