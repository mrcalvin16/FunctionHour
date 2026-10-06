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
