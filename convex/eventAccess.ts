import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const EVENT_ROLES = [
  "owner",
  "admin",
  "ticket_manager",
  "check_in_staff",
  "marketing",
  "viewer",
] as const;

export type EventRole = (typeof EVENT_ROLES)[number];

export type EventCapability =
  | "manage_event"
  | "manage_team"
  | "manage_payouts"
  | "manage_tickets"
  | "issue_comp_tickets"
  | "check_in"
  | "manage_marketing"
  | "view_reports";

type EventContext = QueryCtx | MutationCtx;

const CAPABILITIES: Record<
  EventRole,
  readonly EventCapability[]
> = {
  owner: [
    "manage_event",
    "manage_team",
    "manage_payouts",
    "manage_tickets",
    "issue_comp_tickets",
    "check_in",
    "manage_marketing",
    "view_reports",
  ],

  admin: [
    "manage_event",
    "manage_team",
    "manage_tickets",
    "issue_comp_tickets",
    "check_in",
    "manage_marketing",
    "view_reports",
  ],

  ticket_manager: [
    "manage_tickets",
    "issue_comp_tickets",
    "check_in",
    "view_reports",
  ],

  check_in_staff: ["check_in"],

  marketing: [
    "manage_marketing",
    "view_reports",
  ],

  viewer: ["view_reports"],
};

const staffRoleValidator = v.union(
  v.literal("admin"),
  v.literal("ticket_manager"),
  v.literal("check_in_staff"),
  v.literal("marketing"),
  v.literal("viewer")
);

export function roleCan(
  role: EventRole,
  capability: EventCapability
): boolean {
  return CAPABILITIES[role].includes(capability);
}

export async function requireIdentity(
  ctx: EventContext
) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("You must be signed in.");
  }

  return identity;
}

export async function getEventRole(
  ctx: EventContext,
  eventId: Id<"events">,
  userId: string,
  email?: string
): Promise<EventRole | null> {
  const event = await ctx.db.get(eventId);

  if (!event) {
    throw new Error("Event not found.");
  }

  if (
    event.userId === userId ||
    event.organizerId === userId
  ) {
    return "owner";
  }

  const teamMember = await ctx.db
    .query("eventTeamMembers")
    .withIndex("by_event_user", (q) =>
      q
        .eq("eventId", eventId)
        .eq("userId", userId)
    )
    .unique();

  if (
    teamMember &&
    teamMember.status === "active"
  ) {
    return teamMember.role;
  }

  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const emailMember = await ctx.db
    .query("eventTeamMembers")
    .withIndex("by_event_email", (q) =>
      q
        .eq("eventId", eventId)
        .eq("email", normalizedEmail)
    )
    .unique();

  if (
    !emailMember ||
    emailMember.status === "revoked"
  ) {
    return null;
  }

  return emailMember.role;
}

export async function requireEventCapability(
  ctx: EventContext,
  eventId: Id<"events">,
  capability: EventCapability
) {
  const identity = await requireIdentity(ctx);

    const role = await getEventRole(
      ctx,
      eventId,
      identity.subject,
      identity.email
  );

  if (
    !role ||
    !roleCan(role, capability)
  ) {
    throw new Error(
      "You do not have permission to perform this action."
    );
  }

  return {
    identity,
    role,
  };
}

export const getMyEventAccess = query({
  args: {
    eventId: v.id("events"),
  },

  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);

    const role = await getEventRole(
      ctx,
      args.eventId,
      identity.subject,
      identity.email
    );

    return {
      role,
      capabilities: role
        ? CAPABILITIES[role]
        : [],
    };
  },
});

export const listEventTeam = query({
  args: {
    eventId: v.id("events"),
  },

  handler: async (ctx, args) => {
    await requireEventCapability(
      ctx,
      args.eventId,
      "manage_team"
    );

    const members = await ctx.db
      .query("eventTeamMembers")
      .withIndex("by_event", (q) =>
        q.eq("eventId", args.eventId)
      )
      .take(500);

    return members.sort(
      (a, b) => b.createdAt - a.createdAt
    );
  },
});

export const upsertEventTeamMember = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: staffRoleValidator,
  },

  handler: async (ctx, args) => {
    const { identity } =
      await requireEventCapability(
        ctx,
        args.eventId,
        "manage_team"
      );

    const now = Date.now();

    const existing = await ctx.db
      .query("eventTeamMembers")
      .withIndex("by_event_user", (q) =>
        q
          .eq("eventId", args.eventId)
          .eq("userId", args.userId)
      )
      .unique();

    const email =
      args.email?.trim().toLowerCase();

    const name = args.name?.trim();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        name,
        role: args.role,
        status: "active",
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert(
      "eventTeamMembers",
      {
        eventId: args.eventId,
        userId: args.userId,
        email,
        name,
        role: args.role,
        status: "active",
        invitedBy: identity.subject,
        createdAt: now,
      }
    );
  },
});

export const inviteEventTeamMember = mutation({
  args: {
    eventId: v.id("events"),
    email: v.string(),
    name: v.optional(v.string()),
    role: staffRoleValidator,
  },

  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(
      ctx,
      args.eventId,
      "manage_team"
    );

    const email = args.email.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      throw new Error("Enter a valid email address.");
    }

    if (identity.email?.trim().toLowerCase() === email) {
      throw new Error("The event owner already has full access.");
    }

    const existing = await ctx.db
      .query("eventTeamMembers")
      .withIndex("by_event_email", (q) =>
        q.eq("eventId", args.eventId).eq("email", email)
      )
      .unique();

    const now = Date.now();
    const name = args.name?.trim();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        role: args.role,
        status: "invited",
        updatedAt: now,
      });

      return existing._id;
    }

    return await ctx.db.insert("eventTeamMembers", {
      eventId: args.eventId,
      userId: `email:${email}`,
      email,
      name,
      role: args.role,
      status: "invited",
      invitedBy: identity.subject,
      createdAt: now,
    });
  },
});

export const getInvitationEmailDetails = query({
  args: {
    serverSecret: v.string(),
    eventId: v.id("events"),
    memberId: v.id("eventTeamMembers"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!process.env.STRIPE_WEBHOOK_SHARED_SECRET || args.serverSecret !== process.env.STRIPE_WEBHOOK_SHARED_SECRET)
      throw new Error("Unauthorized server request.");
    const role = await getEventRole(ctx, args.eventId, args.clerkId);
    if (!role || !roleCan(role, "manage_team"))
      throw new Error("You do not have permission to invite team members.");
    const [event, member] = await Promise.all([ctx.db.get(args.eventId), ctx.db.get(args.memberId)]);
    if (!event || !member || member.eventId !== event._id || member.status !== "invited" || !member.email) return null;
    return {
      eventName: event.name,
      eventId: event._id,
      memberId: member._id,
      email: member.email,
      name: member.name ?? "",
      role: member.role,
      updatedAt: member.updatedAt ?? member.createdAt,
    };
  },
});

export const updateEventTeamMemberRole = mutation({
  args: {
    eventId: v.id("events"),
    memberId: v.id("eventTeamMembers"),
    role: staffRoleValidator,
  },

  handler: async (ctx, args) => {
    await requireEventCapability(ctx, args.eventId, "manage_team");
    const member = await ctx.db.get(args.memberId);

    if (!member || member.eventId !== args.eventId) {
      throw new Error("Team member not found.");
    }

    await ctx.db.patch(args.memberId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const revokeEventTeamMember =
  mutation({
    args: {
      eventId: v.id("events"),
      memberId: v.id("eventTeamMembers"),
    },

    handler: async (ctx, args) => {
      await requireEventCapability(
        ctx,
        args.eventId,
        "manage_team"
      );

      const member = await ctx.db.get(
        args.memberId
      );

      if (
        !member ||
        member.eventId !== args.eventId
      ) {
        throw new Error(
          "Team member not found."
        );
      }

      await ctx.db.patch(args.memberId, {
        status: "revoked",
        updatedAt: Date.now(),
      });

      return {
        success: true,
      };
    },
  });
