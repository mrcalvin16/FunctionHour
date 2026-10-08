type EventDateFields = {
  dateString?: string;
  eventDate?: number;
  eventStatus?: "scheduled" | "postponed" | "cancelled";
  salesEndAt?: number;
  isSoldOut?: boolean;
  totalTickets?: number;
  ticketsSold?: number;
};

export function getEventEndTimestamp(event: EventDateFields) {
  if (event.dateString && /^\d{4}-\d{2}-\d{2}$/.test(event.dateString)) {
    return new Date(`${event.dateString}T23:59:59.999`).getTime();
  }

  if (Number.isFinite(event.eventDate)) return Number(event.eventDate);
  if (!event.dateString) return Number.NaN;
  return Date.parse(event.dateString);
}

export function isEventUpcoming(
  event: EventDateFields,
  referenceTime = Date.now(),
) {
  if (event.eventStatus === "cancelled" || event.eventStatus === "postponed") return false;
  const timestamp = getEventEndTimestamp(event);
  return !Number.isFinite(timestamp) || timestamp >= referenceTime;
}

export function isEventPast(event: EventDateFields, referenceTime = Date.now()) {
  if (event.eventStatus === "cancelled" || event.eventStatus === "postponed") return false;
  const timestamp = getEventEndTimestamp(event);
  return Number.isFinite(timestamp) && timestamp < referenceTime;
}

export function requireEventSalesOpen(event: EventDateFields) {
  if (event.eventStatus === "cancelled" || event.eventStatus === "postponed") {
    throw new Error("Ticket sales are paused while this event is cancelled or postponed.");
  }
  if (!isEventUpcoming(event)) {
    throw new Error("Ticket sales have ended for this event.");
  }
  if (event.isSoldOut || (event.totalTickets !== undefined && event.totalTickets > 0 && (event.ticketsSold ?? 0) >= event.totalTickets)) {
    throw new Error("This event is sold out.");
  }
  if (event.salesEndAt !== undefined && Date.now() >= event.salesEndAt) {
    throw new Error("The organizer's ticket sales deadline has passed.");
  }
}
