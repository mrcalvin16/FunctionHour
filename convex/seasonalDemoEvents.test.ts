/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { SEASONAL_DEMOS } from "./seasonalDemoData";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

function setup() { return convexTest(schema, modules); }

test("adds exactly fifteen clearly labeled demos with ticket options and usable dates", async () => {
  const t = setup();
  const result = await t.mutation(internal.seasonalDemoEvents.seed, {});
  expect(result).toMatchObject({ created: 15, skipped: 0, total: 15 });
  expect(new Set(result.eventIds).size).toBe(15);
  const events = await t.run(async (ctx) => ctx.db.query("events").take(100));
  expect(events).toHaveLength(15);
  for (const event of events) {
    expect(event.isDemo).toBe(true);
    expect(event.demoHidden).toBe(false);
    expect(event.description).toContain("fictional event");
    expect(event.venueName).toContain("Demo");
    expect(event.userId).toMatch(/^demo-seasonal-/);
    expect(event.eventDate).toBe(Date.parse(event.dateString));
    expect(event.eventDate).toBeGreaterThan(Date.parse("2026-11-06T00:00:00Z"));
    expect(event.endDate).toBeGreaterThan(event.eventDate);
    const types = await t.run(async (ctx) => ctx.db.query("ticketTypes")
      .withIndex("by_event", (q) => q.eq("eventId", event._id)).take(10));
    expect(types).toHaveLength(1);
    expect(types[0].price).toBe(event.price);
    expect(types[0].quantity).toBe(event.totalTickets);
  }
  expect(SEASONAL_DEMOS.filter((event) => event.tags.some((tag) => tag === "church outreach"))).toHaveLength(3);
  expect(SEASONAL_DEMOS.filter((event) => event.tags.some((tag) => tag === "New Year’s Eve"))).toHaveLength(3);
  expect(SEASONAL_DEMOS.filter((event) => event.tags.some((tag) => tag === "bar mitzvah" || tag === "bat mitzvah"))).toHaveLength(2);
  expect(SEASONAL_DEMOS.filter((event) => event.tags.some((tag) => tag === "holiday party"))).toHaveLength(3);
  expect(SEASONAL_DEMOS.filter((event) => event.tags.some((tag) => tag === "concert" || tag === "gospel concert"))).toHaveLength(3);
});

test("reruns do not duplicate listings or reset edits, visibility, inventory, or ticket options", async () => {
  const t = setup(); const first = await t.mutation(internal.seasonalDemoEvents.seed, {});
  const original = await t.run(async (ctx) => {
    const eventId = first.eventIds[0];
    await ctx.db.patch(eventId, { demoHidden: true, description: "Preserve this demo edit", ticketsSold: 3 });
    const ticket = await ctx.db.query("ticketTypes").withIndex("by_event", (q) => q.eq("eventId", eventId)).first();
    await ctx.db.patch(ticket!._id, { sold: 3 });
    return { event: await ctx.db.get(eventId), ticket: await ctx.db.get(ticket!._id) };
  });
  const second = await t.mutation(internal.seasonalDemoEvents.seed, {});
  expect(second).toMatchObject({ created: 0, skipped: 15, total: 15 });
  expect(second.eventIds).toEqual(first.eventIds);
  expect(await t.run(async (ctx) => ctx.db.get(first.eventIds[0]))).toEqual(original.event);
  expect(await t.run(async (ctx) => ctx.db.get(original.ticket!._id))).toEqual(original.ticket);
  expect(await t.run(async (ctx) => (await ctx.db.query("users").take(100)).length)).toBe(3);
});

test("leaves real events and unrelated old demos unchanged", async () => {
  const t = setup();
  const protectedEvents = await t.run(async (ctx) => {
    const base = { name: "Existing listing", description: "Do not replace", location: "New Orleans", eventDate: Date.parse("2026-12-31T20:00:00-06:00"), dateString: "2026-12-31T20:00:00-06:00", ticketsSold: 7 };
    const real = await ctx.db.insert("events", { ...base, userId: "demo-seasonal-outreach", demoKey: SEASONAL_DEMOS[0].key, isDemo: false });
    const old = await ctx.db.insert("events", { ...base, userId: "older-demo-owner", isDemo: true, demoKey: "older-demo-key", demoHidden: true });
    return [await ctx.db.get(real), await ctx.db.get(old)];
  });
  await t.mutation(internal.seasonalDemoEvents.seed, {});
  for (const event of protectedEvents) {
    expect(await t.run(async (ctx) => ctx.db.get(event!._id))).toEqual(event);
  }
  expect(await t.run(async (ctx) => (await ctx.db.query("events").take(100)).length)).toBe(17);
});

test("new demo listings cannot issue real tickets", async () => {
  const t = setup(); const result = await t.mutation(internal.seasonalDemoEvents.seed, {});
  const visitor = t.withIdentity({ subject: "demo-visitor", name: "Demo Visitor", email: "visitor@example.com" });
  for (const eventId of result.eventIds) {
    await expect(visitor.mutation(api.tickets.createTicket, { eventId, quantity: 1 })).rejects.toThrow(/sample event/);
  }
  expect(await t.run(async (ctx) => ctx.db.query("tickets").take(100))).toHaveLength(0);
});
