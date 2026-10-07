"use client";

import type { Id } from "@/convex/_generated/dataModel";
import EventSelector from "../cards/EventSelector";
import GateSelector from "../cards/GateSelector";
import FeedbackControls from "../cards/FeedbackControls";

type OrganizerEvent = {
  _id: Id<"events">;
  name: string;
};

type CheckInHeaderProps = {
  events: OrganizerEvent[];
  eventId: Id<"events"> | null;
  gate: string;
  lockEventSelection?: boolean;
  onEventChange: (eventId: Id<"events">) => void;
  onGateChange: (gate: string) => void;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onSoundToggle: () => void;
  onHapticsToggle: () => void;
};

export default function CheckInHeader({
  events,
  eventId,
  gate,
  lockEventSelection = false,
  onEventChange,
  onGateChange,
  soundEnabled,
  hapticsEnabled,
  onSoundToggle,
  onHapticsToggle,
}: CheckInHeaderProps) {
  return (
    <header className="flex flex-col gap-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-700">
          Event staff · Door desk
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
          Guest entry
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
          Scan a pass or find a guest. Each entry is checked against the live ticket list.
        </p>
      </div>

      <div
        className={`grid w-full items-end gap-3 ${lockEventSelection ? "sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-[420px]" : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:max-w-[660px]"}`}
      >
        {!lockEventSelection ? (
          <EventSelector
            events={events}
            eventId={eventId}
            onEventChange={onEventChange}
          />
        ) : null}

        <GateSelector
          gate={gate}
          onGateChange={onGateChange}
        />

        <details className="relative sm:self-end">
          <summary className="flex h-12 cursor-pointer list-none items-center justify-center rounded-2xl border border-zinc-300 px-4 text-sm font-bold text-zinc-800 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">Scan settings</summary>
          <div className="mt-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg sm:absolute sm:right-0 sm:z-20 sm:w-64">
            <FeedbackControls soundEnabled={soundEnabled} hapticsEnabled={hapticsEnabled} onSoundToggle={onSoundToggle} onHapticsToggle={onHapticsToggle} />
          </div>
        </details>
      </div>
    </header>
  );
}
