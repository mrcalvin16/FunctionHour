/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
const setup = () => convexTest(schema, modules);
type TestContext = ReturnType<typeof setup>;
const buyer = (t: TestContext) => t.withIdentity({ subject: "guest", email: "guest@example.com" });

async function seed(t: TestContext, options: { limit?: number; capacity?: number; typeCapacity?: number; price?: number } = {}) {
  return t.run(async (ctx) => {
    const eventId = await ctx.db.insert("events", {
      name: "Group RSVP", description: "Free admission", location: "New Orleans",
      eventDate: Date.UTC(2099, 11, 1), dateString: "2099-12-01",
      userId: "organizer", price: 0, totalTickets: options.capacity ?? 20,
      ticketsSold: 0, maxTicketsPerOrder: options.limit ?? 4,
    });
    const ticketTypeId = await ctx.db.insert("ticketTypes", {
      eventId, name: "General admission", price: options.price ?? 0,
      quantity: options.typeCapacity ?? 20, sold: 0, isActive: true,
    });
    return { eventId, ticketTypeId };
  });
}

async function inventory(t: TestContext, ids: Awaited<ReturnType<typeof seed>>) {
  return t.run(async (ctx) => ({
    event: await ctx.db.get(ids.eventId),
    type: await ctx.db.get(ids.ticketTypeId),
    tickets: await ctx.db.query("tickets").collect(),
  }));
}

test("one RSVP issues four separate, uniquely scannable tickets and updates both inventories", async () => {
  const t = setup(); const ids = await seed(t);
  const firstId = await buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 4 });
  const state = await inventory(t, ids);
  expect(state.tickets).toHaveLength(4);
  expect(state.tickets[0]._id).toBe(firstId);
  expect(new Set(state.tickets.map((ticket) => ticket.qrCode)).size).toBe(4);
  expect(state.tickets.every((ticket) => ticket.status === "active" && ticket.checkedIn === false && ticket.buyerEmail === "guest@example.com")).toBe(true);
  expect(state.event?.ticketsSold).toBe(4);
  expect(state.type?.sold).toBe(4);
});

test.each([0, -1, 1.5, 5, 11])("rejects invalid or over-limit quantity %s without issuing tickets", async (quantity) => {
  const t = setup(); const ids = await seed(t);
  await expect(buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity })).rejects.toThrow(/up to 4 tickets/);
  expect((await inventory(t, ids)).tickets).toHaveLength(0);
});

test("respects an organizer's one-ticket limit", async () => {
  const t = setup(); const ids = await seed(t, { limit: 1 });
  await expect(buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 2 })).rejects.toThrow(/up to 1 tickets/);
});

test.each([{ capacity: 2 }, { typeCapacity: 2 }])("rejects a group larger than remaining inventory: %j", async (options) => {
  const t = setup(); const ids = await seed(t, options);
  await expect(buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 3 })).rejects.toThrow(/not enough|sold out/);
  const state = await inventory(t, ids);
  expect(state.tickets).toHaveLength(0);
  expect(state.event?.ticketsSold).toBe(0);
  expect(state.type?.sold).toBe(0);
});

test("keeps old single-ticket requests compatible and prevents duplicate RSVP submissions", async () => {
  const t = setup(); const ids = await seed(t);
  await buyer(t).mutation(api.tickets.createTicket, ids);
  await expect(buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 4 })).rejects.toThrow(/already have a ticket/);
  expect((await inventory(t, ids)).tickets).toHaveLength(1);
});

test("respects the organizer limit when the event has no ticket types", async () => {
  const t = setup(); const ids = await seed(t);
  await t.run(async (ctx) => { await ctx.db.delete(ids.ticketTypeId); });
  await buyer(t).mutation(api.tickets.createTicket, { eventId: ids.eventId, quantity: 4 });
  expect((await inventory(t, ids)).event?.ticketsSold).toBe(4);
});

test("does not allow paid admission through the free RSVP mutation", async () => {
  const t = setup(); const ids = await seed(t, { price: 15 });
  await expect(buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 4 })).rejects.toThrow(/Paid tickets require checkout/);
  expect((await inventory(t, ids)).tickets).toHaveLength(0);
});

test("requires authentication", async () => {
  const t = setup(); const ids = await seed(t);
  await expect(t.mutation(api.tickets.createTicket, { ...ids, quantity: 4 })).rejects.toThrow(/signed in/);
});

test("free order-level add-ons are consumed and attached only once", async () => {
  const t = setup(); const ids = await seed(t);
  const addOnId = await t.run(async (ctx) => ctx.db.insert("ticketAddOns", {
    eventId: ids.eventId, name: "Parking", price: 0, quantity: 1, sold: 0, isActive: true,
  }));
  await buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 4, addOnIds: [addOnId] });
  const state = await inventory(t, ids);
  expect(state.tickets.filter((ticket) => ticket.addOns?.length)).toHaveLength(1);
  expect(await t.run(async (ctx) => (await ctx.db.get(addOnId))?.sold)).toBe(1);
});

test("events without an explicit limit retain the ten-ticket default", async () => {
  const t = setup(); const ids = await seed(t);
  await t.run(async (ctx) => { await ctx.db.patch(ids.eventId, { maxTicketsPerOrder: undefined }); });
  await buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 10 });
  expect((await inventory(t, ids)).tickets).toHaveLength(10);
});

test("a failed email check rolls back inventory changes for the whole group", async () => {
  const t = setup(); const ids = await seed(t);
  await expect(t.withIdentity({ subject: "no-email" }).mutation(api.tickets.createTicket, { ...ids, quantity: 4 })).rejects.toThrow(/valid email/);
  const state = await inventory(t, ids);
  expect(state.tickets).toHaveLength(0);
  expect(state.type?.sold).toBe(0);
  expect(state.event?.ticketsSold).toBe(0);
});

test("separate group reservations cannot oversell the final spots", async () => {
  const t = setup(); const ids = await seed(t, { capacity: 5, typeCapacity: 5 });
  const outcomes = await Promise.allSettled([
    buyer(t).mutation(api.tickets.createTicket, { ...ids, quantity: 3 }),
    t.withIdentity({ subject: "other", email: "other@example.com" }).mutation(api.tickets.createTicket, { ...ids, quantity: 3 }),
  ]);
  expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
  const state = await inventory(t, ids);
  expect(state.tickets).toHaveLength(3);
  expect(state.event?.ticketsSold).toBe(3);
  expect(state.type?.sold).toBe(3);
});
