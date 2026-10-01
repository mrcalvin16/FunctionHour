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
      const input = await request.json() as { id: Id<"supportRequests">; status: "new" | "in_progress" | "resolved" };
      await ctx.runMutation(internal.supportRequests.setStatus, input);
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: "Unable to update request." }, { status: 400 });
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
