"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

interface Props {
  eventId: string;
  title?: string;
  location?: string;
  date?: string;
  compact?: boolean;
}

export default function ShareEventButton({
  eventId,
  title = "Check out this event",
  location,
  date,
  compact = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${eventId}`
      : "";

  const shareText = [title, date, location].filter(Boolean).join(" • ");

  const shareEvent = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; leave the event URL available through the event page.
      window.prompt("Copy this event link", url);
    }
  };

  return (
    <button
      type="button"
      onClick={shareEvent}
      className={compact ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-xs font-bold text-zinc-900 transition hover:border-violet-500 hover:bg-violet-50" : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/25 px-3 text-xs font-bold text-white transition hover:bg-white/10"}
    >
      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
      {copied ? "Link copied" : compact ? "Invite" : "Invite friends"}
    </button>
  );
}
