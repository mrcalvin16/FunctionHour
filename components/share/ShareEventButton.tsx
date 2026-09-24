"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

interface Props {
  eventId: string;
  title?: string;
  location?: string;
}

export default function ShareEventButton({
  eventId,
  title = "Check out this event",
  location,
}: Props) {
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${eventId}`
      : "";

  const shareText = `${title}${location ? ` • ${location}` : ""}`;

  const shareEvent = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={shareEvent}
      className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
      {copied ? "Link copied" : "Share event"}
    </button>
  );
}
