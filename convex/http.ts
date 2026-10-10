import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

function authorized(request: Request) {
  const expected = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  return Boolean(expected && request.headers.get("x-functionhour-internal-secret") === expected);
}

http.route({
  path: "/support/requests", method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return new Response("Forbidden", { status: 403 });
    try {
      const input = await request.json();
      const id = await ctx.runMutation(internal.supportRequests.create, input);
      return Response.json({ id });
    } catch {
      return Response.json({ error: "Invalid support request." }, { status: 400 });
    }
  }),
});

http.route({
  path: "/support/requests", method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return new Response("Forbidden", { status: 403 });
    const requests = await ctx.runQuery(internal.supportRequests.listRecent, {});
    return Response.json({ requests }, { headers: { "Cache-Control": "no-store" } });
  }),
});

http.route({
  path: "/support/requests/status", method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return new Response("Forbidden", { status: 403 });
    try {
      const input = await request.json() as { id: Id<"supportRequests">; statusTokenHash: string };
      if (!/^[a-z0-9]{20,40}$/.test(input.id) || !/^[a-f0-9]{64}$/.test(input.statusTokenHash)) {
        return new Response("Invalid request", { status: 400 });
      }
      const result = await ctx.runQuery(internal.supportRequests.getCustomerStatus, input);
      return result ? Response.json(result, { headers: { "Cache-Control": "no-store" } })
        : new Response("Not found", { status: 404 });
    } catch { return new Response("Invalid request", { status: 400 }); }
  }),
});

http.route({
  path: "/support/requests/activity", method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return new Response("Forbidden", { status: 403 });
    try {
      const input = await request.json() as { id: Id<"supportRequests"> };
      const result = await ctx.runQuery(internal.supportRequests.getActivity, input);
      return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch {
      return Response.json({ error: "Unable to load case activity." }, { status: 400 });
    }
  }),
});

http.route({
  path: "/support/requests/case", method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return new Response("Forbidden", { status: 403 });
    try {
      const input = await request.json() as {
        id: Id<"supportRequests">; actorId: string;
        action: "claim" | "release" | "priority" | "status" | "note" | "follow_up" | "reply_recorded";
        status?: "new" | "in_progress" | "waiting_on_organizer" | "resolved";
        priority?: "standard" | "urgent";
        note?: string; followUpAt?: number;
      };
      await ctx.runMutation(internal.supportRequests.updateCase, input);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Unable to update case." }, { status: 400 });
    }
  }),
});

http.route({
  path: "/support/requests/notification", method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return new Response("Forbidden", { status: 403 });
    try {
      const input = await request.json() as { id: Id<"supportRequests">; status: "delivered" | "failed" };
      await ctx.runMutation(internal.supportRequests.setNotificationStatus, input);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Unable to update delivery." }, { status: 400 });
    }
  }),
});

export default http;
