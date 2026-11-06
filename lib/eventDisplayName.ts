/** Keep legacy demo markers out of titles; the separate isDemo notice remains authoritative. */
export function eventDisplayName(event: { name: string; isDemo?: boolean }) {
  return event.isDemo ? event.name.replace(/\s*\(demo\)\s*$/i, "").trimEnd() : event.name;
}
