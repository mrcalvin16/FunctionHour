import type { Id } from "@/convex/_generated/dataModel";

type OrganizerEvent = {
  _id: Id<"events">;
  name: string;
};

type EventSelectorProps = {
  events: OrganizerEvent[];
  eventId: Id<"events"> | null;
  onEventChange: (eventId: Id<"events">) => void;
};

export default function EventSelector({
  events,
  eventId,
  onEventChange,
}: EventSelectorProps) {
  return (
    <div>
      <label
        htmlFor="active-event"
        className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-zinc-700"
      >
        Active event
      </label>

      <select
        id="active-event"
        value={eventId ?? ""}
        onChange={(event) =>
          onEventChange(event.target.value as Id<"events">)
        }
        className="h-12 w-full min-w-0 rounded-2xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-950 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
      >
        {events.map((event) => (
          <option key={event._id} value={event._id}>
            {event.name}
          </option>
        ))}
      </select>
    </div>
  );
}
