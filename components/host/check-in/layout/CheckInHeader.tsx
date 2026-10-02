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
    <header className="flex flex-col gap-5 2xl:flex-row 2xl:items-end 2xl:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-700">
          Door Operations
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
          Check-In
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
          Scan tickets, find guests, prevent duplicate entry,
          and monitor live attendance.
        </p>
      </div>

      <div
        className={`grid w-full gap-3 ${
          lockEventSelection
            ? "sm:grid-cols-2 2xl:w-[520px]"
            : "sm:grid-cols-3 2xl:w-[780px]"
        }`}
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

        <FeedbackControls
          soundEnabled={soundEnabled}
          hapticsEnabled={hapticsEnabled}
          onSoundToggle={onSoundToggle}
          onHapticsToggle={onHapticsToggle}
        />
      </div>
    </header>
  );
}
