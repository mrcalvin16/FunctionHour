/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { eventDisplayName } from "../lib/eventDisplayName";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

test("strips only a trailing demo marker on flagged sample events", () => {
  expect(eventDisplayName({ name: "Holiday Concert (Demo)", isDemo: true })).toBe("Holiday Concert");
  expect(eventDisplayName({ name: "Holiday Concert (DEMO)  ", isDemo: true })).toBe("Holiday Concert");
  expect(eventDisplayName({ name: "Demo Day: Live Music", isDemo: true })).toBe("Demo Day: Live Music");
  expect(eventDisplayName({ name: "Holiday Concert (Demo)", isDemo: false })).toBe("Holiday Concert (Demo)");
  expect(eventDisplayName({ name: "Holiday Concert (Demo)" })).toBe("Holiday Concert (Demo)");
});

test("public discovery and detail queries show clean titles while retaining demo warnings and booking protection", async () => {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const base = { name: "Holiday Concert (Demo)", description: "Fictional event", city: "New Orleans", location: "New Orleans, LA", venueName: "Demo Venue", eventDate: Date.UTC(2099, 11, 1), dateString: "2099-12-01", userId: "demo-title-host", imageUrl: "https://example.com/illustrative.jpg", totalTickets: 100, price: 0 };
    const demo = await ctx.db.insert("events", { ...base, isDemo: true });
    const real = await ctx.db.insert("events", { ...base, isDemo: false });
    return { demo, real };
  });
  for (const events of [
    await t.query(api.events.getAll, {}),
    await t.query(api.events.getMapEvents, {}),
    await t.query(api.events.getEventsByCity, { city: "New Orleans" }),
    await t.query(api.events.getEventsByVenue, { venueName: "Demo Venue" }),
    await t.query(api.events.getTrendingEvents, {}),
  ]) {
    expect(events.find((event) => event._id === ids.demo)?.name).toBe("Holiday Concert");
    expect(events.find((event) => event._id === ids.demo)?.isDemo).toBe(true);
    expect(events.find((event) => event._id === ids.real)?.name).toBe("Holiday Concert (Demo)");
  }
  const demo = await t.query(api.events.getById, { eventId: ids.demo });
  expect(demo).toMatchObject({ name: "Holiday Concert", isDemo: true });
  expect(await t.run(async (ctx) => (await ctx.db.get(ids.demo))?.name)).toBe("Holiday Concert (Demo)");
  await expect(t.withIdentity({ subject: "visitor", name: "Visitor", email: "visitor@example.com" }).mutation(api.tickets.createTicket, { eventId: ids.demo })).rejects.toThrow(/sample event/);
});
