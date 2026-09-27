import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

type AuthIdentity = {
  subject: string;
  tokenIdentifier: string;
};

const attendeeInterestValidator = v.union(
  v.literal("music"),
  v.literal("nightlife"),
  v.literal("festivals"),
  v.literal("food"),
  v.literal("sports"),
  v.literal("networking"),
  v.literal("community"),
  v.literal("arts")
);

const notificationPreferenceValidator = v.union(
  v.literal("essential"),
  v.literal("email"),
  v.literal("text"),
  v.literal("email_and_text")
);

async function findCurrentUser(
  ctx: QueryCtx | MutationCtx,
  identity: AuthIdentity
) {
  const byTokenIdentifier = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .first();

  if (byTokenIdentifier) {
    return byTokenIdentifier;
  }

  const byClerkId = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) =>
      q.eq("clerkId", identity.subject)
    )
    .first();

  if (byClerkId) {
    return byClerkId;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_userId", (q) =>
      q.eq("userId", identity.subject)
    )
    .first();
}

export const updateUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const existingUser = await findCurrentUser(
      ctx,
      identity
    );

    const patch = {
      clerkId: identity.subject,
      userId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      name: args.name.trim() || undefined,
      email: args.email.trim() || undefined,
      updatedAt: Date.now(),
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, patch);
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      ...patch,
      createdAt: Date.now(),
      role: "attendee",
      onboardingComplete: false,
      attendeeOnboardingComplete: false,
      isOrganizer: false,
      verificationRequested: false,
      isVerifiedOrganizer: false,
    });
  },
});

export const completeAttendeeOnboarding = mutation({
  args: {
    name: v.string(),
    city: v.optional(v.string()),
    interests: v.array(attendeeInterestValidator),
    notificationPreference: notificationPreferenceValidator,
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const name = args.name.trim().slice(0, 100);
    const city = args.city?.trim().slice(0, 100);
    const interests = [...new Set(args.interests)];

    if (!name) {
      throw new Error("Enter your name to continue.");
    }

    if (interests.length > 8) {
      throw new Error("Choose up to eight interests.");
    }

    const existingUser = await findCurrentUser(
      ctx,
      identity
    );
    const now = Date.now();
    const attendeeProfile = {
      clerkId: identity.subject,
      userId: identity.subject,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email?.trim().toLowerCase(),
      name,
      city: city || undefined,
      interests,
      notificationPreference: args.notificationPreference,
      attendeeOnboardingComplete: true,
      attendeeOnboardingCompletedAt: now,
      onboardingComplete: true,
      updatedAt: now,
    };

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        ...attendeeProfile,
        role: existingUser.isOrganizer
          ? existingUser.role ?? "organizer"
          : "attendee",
      });

      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      ...attendeeProfile,
      role: "attendee",
      createdAt: now,
      isOrganizer: false,
      verificationRequested: false,
      isVerifiedOrganizer: false,
    });
  },
});

export const getCurrentUser = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return null;
    }

    return await findCurrentUser(ctx, identity);
  },
});

export const getOrganizerAccess = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        canAccessOrganizerTools: false,
        isOrganizer: false,
        isEventStaff: false,
      };
    }

    const user = await findCurrentUser(ctx, identity);
    const ownedEvent = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    const directMembership = await ctx.db
      .query("eventTeamMembers")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .first();
    const email = identity.email?.trim().toLowerCase();
    const emailMembership = email
      ? await ctx.db
          .query("eventTeamMembers")
          .withIndex("by_email", (q) => q.eq("email", email))
          .filter((q) => q.neq(q.field("status"), "revoked"))
          .first()
      : null;
    const isOrganizer = user?.isOrganizer === true || Boolean(ownedEvent);
    const isEventStaff = Boolean(directMembership || emailMembership);

    return {
      canAccessOrganizerTools: isOrganizer || isEventStaff,
      isOrganizer,
      isEventStaff,
    };
  },
});


export const getBrandKit = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await findCurrentUser(ctx, identity);
    if (!user) return null;
    let logoUrl: string | null = null;
    if (user.brandLogoStorageId) {
      try {
        logoUrl = await ctx.storage.getUrl(user.brandLogoStorageId);
      } catch {
        // A deleted or legacy storage reference must never make Flyer Studio unusable.
        logoUrl = null;
      }
    }
    const validHex = (value: unknown): value is string =>
      typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
    return {
      primaryColor: validHex(user.brandPrimaryColor) ? user.brandPrimaryColor : "#8b5cf6",
      secondaryColor: validHex(user.brandSecondaryColor) ? user.brandSecondaryColor : "#ffffff",
      fontFamily: typeof user.brandFontFamily === "string" && user.brandFontFamily.trim()
        ? user.brandFontFamily.slice(0, 200)
        : "Arial, Helvetica, sans-serif",
      logoStorageId: logoUrl ? user.brandLogoStorageId : undefined,
      logoUrl,
    };
  },
});

export const saveBrandKit = mutation({
  args: {
    primaryColor: v.string(),
    secondaryColor: v.string(),
    fontFamily: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be signed in.");
    const user = await findCurrentUser(ctx, identity);
    if (!user) throw new Error("Complete your profile before saving a brand kit.");
    const colorPattern = /^#[0-9a-fA-F]{6}$/;
    if (!colorPattern.test(args.primaryColor) || !colorPattern.test(args.secondaryColor)) {
      throw new Error("Brand colors must be valid hex colors.");
    }
    await ctx.db.patch(user._id, {
      brandPrimaryColor: args.primaryColor,
      brandSecondaryColor: args.secondaryColor,
      brandFontFamily: args.fontFamily.slice(0, 200),
      brandLogoStorageId: args.logoStorageId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
