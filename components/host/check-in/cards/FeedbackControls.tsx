"use client";

import { Smartphone, Volume2, VolumeX } from "lucide-react";

export default function FeedbackControls({
  soundEnabled,
  hapticsEnabled,
  onSoundToggle,
  onHapticsToggle,
}: {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onSoundToggle: () => void;
  onHapticsToggle: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-700">
        Scan feedback
      </p>
      <div className="flex h-12 items-center gap-1 rounded-2xl border border-zinc-300 bg-white p-1">
        <button
          type="button"
          onClick={onSoundToggle}
          aria-pressed={soundEnabled}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 ${
            soundEnabled
              ? "bg-zinc-900 text-white"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
          Sound
        </button>
        <button
          type="button"
          onClick={onHapticsToggle}
          aria-pressed={hapticsEnabled}
          className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 ${
            hapticsEnabled
              ? "bg-orange-100 text-orange-900"
              : "text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Haptics
        </button>
      </div>
    </div>
  );
}
