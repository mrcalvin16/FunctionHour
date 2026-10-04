import type { Id } from "@/convex/_generated/dataModel";

const EVENT_ID_PATTERN = /^[a-z0-9]{20,48}$/i;

export function parseEventId(value: string | string[] | undefined): Id<"events"> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && EVENT_ID_PATTERN.test(candidate)
    ? (candidate as Id<"events">)
    : null;
}

export function staffSignInUrl(eventId: Id<"events"> | string): string {
  return `/staff/sign-in?eventId=${encodeURIComponent(eventId)}`;
}

export function staffAcceptUrl(eventId: Id<"events"> | string): string {
  return `/staff/accept?eventId=${encodeURIComponent(eventId)}`;
}
