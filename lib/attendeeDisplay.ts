export function attendeeEventDate(event: { dateString?: string; eventDate?: number }) {
  const dateOnly = event.dateString?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  // Calendar-only dates are not instants: preserve the host's day in every timezone.
  const date = dateOnly ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))) : new Date(event.eventDate ?? event.dateString ?? "");
  if (!Number.isFinite(date.getTime())) return "Date to be announced";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric", ...(dateOnly ? { timeZone: "UTC" } : { hour: "numeric", minute: "2-digit" }) }).format(date);
}
export function attendeeVenue(event: { venueName?: string; city?: string; location?: string }) {
  return [...new Set([event.venueName?.trim(), event.city?.trim()].filter(Boolean))].join(" · ") || event.location || "Venue to be announced";
}

// Show the wall-clock times entered by the organizer, without converting to the visitor's timezone.
export function attendeeEventTimeRange(event: { dateString?: string; eventDate?: number; endDateString?: string; endDate?: number }) {
  if (!event.endDateString && !Number.isFinite(event.endDate)) {
    return attendeeEventDate(event) + " · End time not listed";
  }
  const formatWallTime = (raw: string | undefined, fallback: number | undefined) => {
    const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    const date = match
      ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])))
      : fallback !== undefined ? new Date(fallback) : null;
    if (!date || !Number.isFinite(date.getTime())) return null;
    const timeZone = match ? "UTC" : undefined;
    return {
      day: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone }).format(date),
      time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(date),
      dateKey: match ? raw!.slice(0, 10) : date.toISOString().slice(0, 10),
    };
  };
  const start = formatWallTime(event.dateString, event.eventDate);
  const end = formatWallTime(event.endDateString, event.endDate);
  if (!start || !end) return attendeeEventDate(event);
  if (start.dateKey === end.dateKey) return `${start.day} · ${start.time} – ${end.time}`;
  return `${start.day} · ${start.time} – ${end.day} · ${end.time}`;
}
