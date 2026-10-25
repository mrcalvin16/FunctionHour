export function attendeeEventDate(event: {
  dateString?: string;
  eventDate?: number;
  endDateString?: string;
  endDate?: number;
}) {
  const dateOnly = event.dateString?.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  // Calendar-only dates are not instants: preserve the host's day in every timezone.
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(event.eventDate ?? event.dateString ?? "");
  if (!Number.isFinite(date.getTime())) return "Date to be announced";

  const fullFormat = new Intl.DateTimeFormat("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : { hour: "numeric", minute: "2-digit" }),
  });
  const startLabel = fullFormat.format(date);
  const end = event.endDate !== undefined
    ? new Date(event.endDate)
    : event.endDateString
      ? new Date(event.endDateString)
      : null;
  if (!end || !Number.isFinite(end.getTime()) || end.getTime() <= date.getTime()) {
    return startLabel;
  }

  // Keep same-day schedules compact; show both dates for overnight events.
  const sameDay =
    date.getFullYear() === end.getFullYear() &&
    date.getMonth() === end.getMonth() &&
    date.getDate() === end.getDate();
  const endLabel = sameDay
    ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(end)
    : new Intl.DateTimeFormat("en-US", {
        weekday: "short", month: "long", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
      }).format(end);
  return `${startLabel} – ${endLabel}`;
}
export function attendeeVenue(event: { venueName?: string; city?: string; location?: string }) {
  return [...new Set([event.venueName?.trim(), event.city?.trim()].filter(Boolean))].join(" · ") || event.location || "Venue to be announced";
}
