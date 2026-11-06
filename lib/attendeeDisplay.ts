export type EventSchedule = {
  dateString?: string;
  eventDate?: number;
  endDateString?: string;
  endDate?: number;
};

const calendarDate = /^\d{4}-\d{2}-\d{2}$/;
const wallDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;

// dateString preserves the schedule entered by the host. Treat zone-free
// values as wall-clock fields, not as instants in the rendering machine's zone.
export function eventDisplayDate(event: EventSchedule): Date {
  const raw = event.dateString?.trim();
  if (raw && calendarDate.test(raw)) return new Date(`${raw}T00:00:00Z`);
  if (raw && wallDateTime.test(raw)) return new Date(`${raw}Z`);
  return new Date(event.eventDate ?? raw ?? "");
}

export function attendeeEventDate(event: EventSchedule) {
  const raw = event.dateString?.trim() ?? "";
  const dateOnly = calendarDate.test(raw);
  const localTime = wallDateTime.test(raw);
  const date = eventDisplayDate(event);
  if (!Number.isFinite(date.getTime())) return "Date to be announced";

  const fullOptions: Intl.DateTimeFormatOptions = {
    timeZone: "UTC", weekday: "short", month: "long", day: "numeric", year: "numeric",
    ...(!dateOnly ? { hour: "numeric", minute: "2-digit" } : {}),
    ...(!dateOnly && !localTime ? { timeZoneName: "short" } : {}),
  };
  const startLabel = new Intl.DateTimeFormat("en-US", fullOptions).format(date);
  if (dateOnly) return startLabel;

  let end: Date | null = null;
  if (event.endDateString) {
    end = eventDisplayDate({ dateString: event.endDateString, eventDate: event.endDate });
  } else if (event.endDate !== undefined) {
    // Legacy records may only have an end instant. Preserve the recorded
    // duration relative to the host's start wall-clock fields.
    end = localTime && Number.isFinite(event.eventDate)
      ? new Date(date.getTime() + event.endDate - event.eventDate!)
      : new Date(event.endDate);
  }
  const suffix = localTime ? " (event local time)" : "";
  if (!end || !Number.isFinite(end.getTime()) || end.getTime() <= date.getTime()) return startLabel + suffix;
  const sameDay = date.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  const endLabel = new Intl.DateTimeFormat("en-US", sameDay ? {
    timeZone: "UTC", hour: "numeric", minute: "2-digit",
    ...(!localTime ? { timeZoneName: "short" } : {}),
  } : fullOptions).format(end);
  return `${startLabel} – ${endLabel}${suffix}`;
}

export function attendeeVenue(event: { venueName?: string; city?: string; location?: string }) {
  return [...new Set([event.venueName?.trim(), event.city?.trim()].filter(Boolean))].join(" · ") || event.location || "Venue to be announced";
}
