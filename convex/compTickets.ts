import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getEventRole, requireEventCapability, roleCan } from "./eventAccess";

function assertServerSecret(secret: string) {
  const expected = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("Unauthorized server request.");
  }
}

export const getDeliveryDetails = query({
  args: {
    serverSecret: v.string(),
    clerkId: v.string(),
    email: v.optional(v.string()),
    compTicketId: v.id("compTickets"),
  },
  handler: async (ctx, args) => {
    assertServerSecret(args.serverSecret);
    const compTicket = await ctx.db.get(args.compTicketId);

    if (!compTicket || !compTicket.ticketId) {
      throw new Error("Comp ticket not found.");
    }

    const role = await getEventRole(
      ctx,
      compTicket.eventId,
      args.clerkId,
      args.email,
    );

    if (!role || !roleCan(role, "issue_comp_tickets")) {
      throw new Error("You do not have permission to send this ticket.");
    }

    if (compTicket.status === "revoked") {
      throw new Error("Restore the comp ticket before sending it.");
    }

    const event = await ctx.db.get(compTicket.eventId);
    if (!event) throw new Error("Event not found.");

    return {
      compTicketId: compTicket._id,
      ticketId: compTicket.ticketId,
      recipientName: compTicket.recipientName,
      recipientEmail: compTicket.recipientEmail,
      quantity: compTicket.quantity,
      ticketTypeName: compTicket.ticketTypeName || "Complimentary Admission",
      eventName: event.name,
      venue: event.venueName || event.location || "See event page for location",
      lastSentAt: compTicket.lastSentAt ?? compTicket.issuedAt,
    };
  },
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createQrToken(eventId: string): string {
  return [
    "functionhour",
    "comp",
    eventId,
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
  ].join(":");
}

export const listForEvent = query({
  args: {
    eventId: v.id("events"),
    status: v.optional(
      v.union(v.literal("active"), v.literal("revoked"), v.literal("redeemed")),
    ),
  },

  handler: async (ctx, args) => {
    await requireEventCapability(ctx, args.eventId, "issue_comp_tickets");

    const records = args.status
      ? await ctx.db
          .query("compTickets")
          .withIndex("by_event_status", (q) =>
            q.eq("eventId", args.eventId).eq("status", args.status!),
          )
          .collect()
      : await ctx.db
          .query("compTickets")
          .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
          .collect();

    return records.sort((a, b) => b.issuedAt - a.issuedAt);
  },
});

export const getAuditHistory = query({
  args: {
    eventId: v.id("events"),
    compTicketId: v.id("compTickets"),
  },

  handler: async (ctx, args) => {
    await requireEventCapability(ctx, args.eventId, "issue_comp_tickets");

    const compTicket = await ctx.db.get(args.compTicketId);

    if (!compTicket || compTicket.eventId !== args.eventId) {
      throw new Error("Comp ticket not found.");
    }

    const history = await ctx.db
      .query("compTicketAudit")
      .withIndex("by_comp_ticket", (q) =>
        q.eq("compTicketId", args.compTicketId),
      )
      .collect();

    return history.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const issue = mutation({
  args: {
    eventId: v.id("events"),
    ticketTypeId: v.optional(v.id("ticketTypes")),
    recipientName: v.string(),
    recipientEmail: v.string(),
    quantity: v.number(),
    note: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(
      ctx,
      args.eventId,
      "issue_comp_tickets",
    );

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    const recipientName = args.recipientName.trim();

    const recipientEmail = normalizeEmail(args.recipientEmail);

    const quantity = Math.floor(args.quantity);

    if (!recipientName) {
      throw new Error("Recipient name is required.");
    }

    if (!recipientEmail || !recipientEmail.includes("@")) {
      throw new Error("Enter a valid recipient email.");
    }

    if (quantity < 1 || quantity > 25) {
      throw new Error("Comp quantity must be between 1 and 25.");
    }

    let ticketTypeName = "Complimentary Admission";

    if (args.ticketTypeId) {
      const ticketType = await ctx.db.get(args.ticketTypeId);

      if (!ticketType || ticketType.eventId !== args.eventId) {
        throw new Error("Ticket type does not belong to this event.");
      }

      if (ticketType.isActive === false) {
        throw new Error("This ticket type is inactive.");
      }

      ticketTypeName = ticketType.name;
    }

    const now = Date.now();

    const compTicketId = await ctx.db.insert("compTickets", {
      eventId: args.eventId,
      ticketTypeId: args.ticketTypeId,
      ticketTypeName,

      recipientName,
      recipientEmail,
      quantity,

      note: args.note?.trim() || undefined,

      status: "active",

      issuedBy: identity.subject,
      issuedAt: now,
      lastSentAt: now,
    });

    const ticketId = await ctx.db.insert("tickets", {
      eventId: args.eventId,

      // Email is used until the recipient
      // has or connects a user account.
      userId: recipientEmail,

      quantity,
      purchasedAt: now,
      createdAt: now,

      status: "active",

      checkedIn: false,

      qrCode: createQrToken(String(args.eventId)),

      buyerEmail: recipientEmail,
      buyerName: recipientName,

      ticketTypeId: args.ticketTypeId,

      ticketTypeName,
      unitPrice: 0,

      ticketSource: "complimentary",

      issuedBy: identity.subject,

      compTicketId,
    });

    await ctx.db.patch(compTicketId, {
      ticketId,
    });

    await ctx.db.insert("compTicketAudit", {
      eventId: args.eventId,
      compTicketId,

      action: "issued",

      performedBy: identity.subject,

      details: `${quantity} ${ticketTypeName} ticket(s) issued to ${recipientEmail}`,

      createdAt: now,
    });

    return {
      compTicketId,
      ticketId,
      recipientEmail,
    };
  },
});

export const revoke = mutation({
  args: {
    eventId: v.id("events"),
    compTicketId: v.id("compTickets"),
    reason: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(
      ctx,
      args.eventId,
      "issue_comp_tickets",
    );

    const compTicket = await ctx.db.get(args.compTicketId);

    if (!compTicket || compTicket.eventId !== args.eventId) {
      throw new Error("Comp ticket not found.");
    }

    if (compTicket.status === "revoked") {
      return {
        success: true,
        alreadyRevoked: true,
      };
    }

    const now = Date.now();

    await ctx.db.patch(args.compTicketId, {
      status: "revoked",
      revokedBy: identity.subject,
      revokedAt: now,
    });

    if (compTicket.ticketId) {
      await ctx.db.patch(compTicket.ticketId, {
        status: "revoked",
        revokedBy: identity.subject,
        revokedAt: now,
      });
    }

    await ctx.db.insert("compTicketAudit", {
      eventId: args.eventId,
      compTicketId: args.compTicketId,

      action: "revoked",

      performedBy: identity.subject,

      details: args.reason?.trim() || "Revoked by organizer",

      createdAt: now,
    });

    return {
      success: true,
      alreadyRevoked: false,
    };
  },
});

export const restore = mutation({
  args: {
    eventId: v.id("events"),
    compTicketId: v.id("compTickets"),
  },

  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(
      ctx,
      args.eventId,
      "issue_comp_tickets",
    );

    const compTicket = await ctx.db.get(args.compTicketId);

    if (!compTicket || compTicket.eventId !== args.eventId) {
      throw new Error("Comp ticket not found.");
    }

    const now = Date.now();

    await ctx.db.patch(args.compTicketId, {
      status: "active",
      revokedBy: undefined,
      revokedAt: undefined,
    });

    if (compTicket.ticketId) {
      await ctx.db.patch(compTicket.ticketId, {
        status: "active",
        revokedBy: undefined,
        revokedAt: undefined,
      });
    }

    await ctx.db.insert("compTicketAudit", {
      eventId: args.eventId,
      compTicketId: args.compTicketId,

      action: "restored",

      performedBy: identity.subject,

      createdAt: now,
    });

    return {
      success: true,
    };
  },
});

// Records resend activity.
// Actual email delivery will be connected
// through an API route or Convex action.
export const markResent = mutation({
  args: {
    eventId: v.id("events"),
    compTicketId: v.id("compTickets"),
  },

  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(
      ctx,
      args.eventId,
      "issue_comp_tickets",
    );

    const compTicket = await ctx.db.get(args.compTicketId);

    if (!compTicket || compTicket.eventId !== args.eventId) {
      throw new Error("Comp ticket not found.");
    }

    if (compTicket.status === "revoked") {
      throw new Error("Restore the comp ticket before resending it.");
    }

    const now = Date.now();

    await ctx.db.patch(args.compTicketId, {
      lastSentAt: now,
    });

    await ctx.db.insert("compTicketAudit", {
      eventId: args.eventId,
      compTicketId: args.compTicketId,

      action: "resent",

      performedBy: identity.subject,

      details: `Ticket delivery recorded for ${compTicket.recipientEmail}`,

      createdAt: now,
    });

    return {
      success: true,
      recipientEmail: compTicket.recipientEmail,
      ticketId: compTicket.ticketId,
    };
  },
});
