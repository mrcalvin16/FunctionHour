import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({


eventInteractions: defineTable({
  userId: v.optional(v.string()),
  eventId: v.string(),
  type: v.string(), // view | click | save | map_hover
  createdAt: v.float64(),
}).index("by_user", ["userId"])
  .index("by_event", ["eventId"]),

  users: defineTable({
    clerkId: v.optional(v.string()),
    userId: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),

    email: v.optional(v.string()),
    name: v.optional(v.string()),

    city: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    notificationPreference: v.optional(
      v.union(
        v.literal("essential"),
        v.literal("email"),
        v.literal("text"),
        v.literal("email_and_text")
      )
    ),
    attendeeOnboardingComplete: v.optional(v.boolean()),
    attendeeOnboardingCompletedAt: v.optional(v.float64()),

    role: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),

    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),

    organizerName: v.optional(v.string()),
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    instagram: v.optional(v.string()),

    isOrganizer: v.optional(v.boolean()),
    verificationRequested: v.optional(v.boolean()),
    isVerifiedOrganizer: v.optional(v.boolean()),

    avatarStorageId: v.optional(v.id("_storage")),
    avatarUrl: v.optional(v.string()),

    bannerStorageId: v.optional(v.id("_storage")),
    bannerUrl: v.optional(v.string()),

    stripeConnectAccountId: v.optional(v.string()),
    stripeConnectCreatedAt: v.optional(v.float64()),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_userId", ["userId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"]),

  events: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.optional(v.string()),
    location: v.string(),

    eventDate: v.float64(),
    dateString: v.string(),

    price: v.optional(v.float64()),
    totalTickets: v.optional(v.float64()),
    ticketsSold: v.optional(v.float64()),
    ratingTotal: v.optional(v.float64()),
    ratingCount: v.optional(v.float64()),

    imageStorageId: v.optional(v.id("_storage")),

    userId: v.string(),
    organizerId: v.optional(v.string()),

    createdAt: v.optional(v.float64()),

    venueName: v.optional(v.string()),
    venueAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),

    refundPolicy: v.optional(v.string()),
    refundDeadline: v.optional(v.string()),
    refundContactEmail: v.optional(v.string()),

    dressCode: v.optional(v.string()),
    ageRequirement: v.optional(v.string()),
    parkingInfo: v.optional(v.string()),
    entryNotes: v.optional(v.string()),

    // PROMOTION / MONETIZATION
    isPromoted: v.optional(v.boolean()),
    promotionTier: v.optional(v.string()),
    promotionEndsAt: v.optional(v.float64()),
    featuredWeight: v.optional(v.float64()),
  })
    .index("by_userId", ["userId"])
    .index("by_eventDate", ["eventDate"])
    .index("by_city", ["city"])
    .index("by_venueName", ["venueName"]),

  tickets: defineTable({
    eventId: v.id("events"),
    userId: v.union(v.id("users"), v.string()),

    quantity: v.optional(v.float64()),
    purchasedAt: v.optional(v.float64()),
    createdAt: v.optional(v.float64()),

    status: v.optional(v.string()),

    checkedIn: v.optional(v.boolean()),
    checkedInAt: v.optional(v.float64()),

    qrCode: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    ticketTypeId: v.optional(v.id("ticketTypes")),
    ticketTypeName: v.optional(v.string()),
    unitPrice: v.optional(v.float64()),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),

    // Complimentary and manually issued ticket metadata
    ticketSource: v.optional(
      v.union(
        v.literal("stripe"),
        v.literal("complimentary"),
        v.literal("manual")
      )
    ),
    issuedBy: v.optional(v.string()),
    compTicketId: v.optional(v.id("compTickets")),
    revokedAt: v.optional(v.float64()),
    revokedBy: v.optional(v.string()),
    checkedInBy: v.optional(v.string()),
  })
    .index("by_event_user", ["eventId", "userId"])
    .index("by_event", ["eventId"])
    .index("by_event_and_purchasedAt", ["eventId", "purchasedAt"])
    .index("by_user", ["userId"])
    .index("by_comp_ticket", ["compTicketId"])
    .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
    .index("by_qrCode", ["qrCode"]),

  ticketOrders: defineTable({
    eventId: v.id("events"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    buyerEmail: v.string(),
    buyerName: v.optional(v.string()),
    currency: v.string(),
    grossAmount: v.float64(),
    platformFeeAmount: v.optional(v.float64()),
    refundedAmount: v.float64(),
    netAmount: v.float64(),
    quantity: v.float64(),
    discountCodeId: v.optional(v.id("discountCodes")),
    discountAmount: v.optional(v.float64()),
    status: v.union(
      v.literal("paid"),
      v.literal("partially_refunded"),
      v.literal("refunded")
    ),
    paidAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
    .index("by_event_and_paidAt", ["eventId", "paidAt"]),

  organizerPayoutRequests: defineTable({
    organizerId: v.string(),
    stripeAccountId: v.string(),
    amount: v.float64(),
    currency: v.string(),
    status: v.union(
      v.literal("requested"),
      v.literal("transferred")
    ),
    stripeTransferId: v.optional(v.string()),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_transfer", ["stripeTransferId"]),

  ticketCheckoutReservations: defineTable({
    reservationId: v.string(),
    eventId: v.id("events"),
    ticketTypeId: v.optional(v.id("ticketTypes")),
    ticketTypeName: v.optional(v.string()),
    buyerEmail: v.string(),
    buyerName: v.optional(v.string()),
    quantity: v.float64(),
    unitPrice: v.float64(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("released")
    ),
    stripeCheckoutSessionId: v.optional(v.string()),
    expiresAt: v.float64(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_reservationId", ["reservationId"])
    .index("by_event", ["eventId"])
    .index("by_buyer_event_status", ["buyerEmail", "eventId", "status"])
    .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"]),

  checkInActivity: defineTable({
    eventId: v.id("events"),
    ticketId: v.id("tickets"),

    staffUserId: v.string(),

    guestName: v.string(),
    guestEmail: v.optional(v.string()),
    ticketType: v.optional(v.string()),

    method: v.string(),
    gate: v.optional(v.string()),

    quantity: v.optional(v.float64()),
    checkedInAt: v.float64(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_time", ["eventId", "checkedInAt"])
    .index("by_ticket", ["ticketId"]),

  eventRatings: defineTable({
    eventId: v.id("events"),
    userId: v.string(),
    rating: v.float64(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_userId", ["eventId", "userId"])
    .index("by_userId", ["userId"]),

  waitingList: defineTable({
    eventId: v.id("events"),
    userId: v.union(v.id("users"), v.string()),

    createdAt: v.optional(v.float64()),
    status: v.optional(v.string()),
    offerExpiresAt: v.optional(v.float64()),
  })
    .index("by_event_user", ["eventId", "userId"])
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"]),

  ticketTypes: defineTable({
    eventId: v.id("events"),

    name: v.string(),
    description: v.optional(v.string()),

    price: v.float64(),

    quantity: v.optional(v.float64()),
    sold: v.optional(v.float64()),

    perks: v.optional(v.array(v.string())),

    isActive: v.optional(v.boolean()),
    isSoldOut: v.optional(v.boolean()),
    salesPaused: v.optional(v.boolean()),

    createdAt: v.optional(v.float64()),
  })
    .index("by_event", ["eventId"]),


  // Event-specific organizer and staff permissions
  eventTeamMembers: defineTable({
    eventId: v.id("events"),
    userId: v.string(),

    email: v.optional(v.string()),
    name: v.optional(v.string()),

    role: v.union(
      v.literal("admin"),
      v.literal("ticket_manager"),
      v.literal("check_in_staff"),
      v.literal("marketing"),
      v.literal("viewer")
    ),

    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("revoked")
    ),

    invitedBy: v.string(),
    createdAt: v.float64(),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["email"])
    .index("by_user", ["userId"])
    .index("by_event_user", ["eventId", "userId"])
    .index("by_event_email", ["eventId", "email"]),

  // Complimentary ticket allocations issued by organizers
  compTickets: defineTable({
    eventId: v.id("events"),

    ticketId: v.optional(v.id("tickets")),
    ticketTypeId: v.optional(v.id("ticketTypes")),
    ticketTypeName: v.optional(v.string()),

    recipientName: v.string(),
    recipientEmail: v.string(),
    quantity: v.float64(),
    note: v.optional(v.string()),

    status: v.union(
      v.literal("active"),
      v.literal("revoked"),
      v.literal("redeemed")
    ),

    issuedBy: v.string(),
    issuedAt: v.float64(),

    revokedBy: v.optional(v.string()),
    revokedAt: v.optional(v.float64()),
    lastSentAt: v.optional(v.float64()),
  })
    .index("by_event", ["eventId"])
    .index("by_email", ["recipientEmail"])
    .index("by_ticket", ["ticketId"])
    .index("by_event_status", ["eventId", "status"]),

  // Audit history for complimentary tickets
  compTicketAudit: defineTable({
    eventId: v.id("events"),
    compTicketId: v.id("compTickets"),

    action: v.union(
      v.literal("issued"),
      v.literal("resent"),
      v.literal("revoked"),
      v.literal("restored"),
      v.literal("checked_in")
    ),

    performedBy: v.string(),
    details: v.optional(v.string()),
    createdAt: v.float64(),
  })
    .index("by_event", ["eventId"])
    .index("by_comp_ticket", ["compTicketId"]),

  eventCreative: defineTable({
    eventId: v.id("events"),
    userId: v.optional(v.union(v.id("users"), v.string())),

    title: v.optional(v.string()),
    prompt: v.optional(v.string()),
    style: v.optional(v.string()),
    caption: v.optional(v.string()),

    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),
    sourceEventId: v.optional(v.string()),
    campaignStatus: v.optional(v.string()),
    editorState: v.optional(v.string()),

    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"]),

  eventMessages: defineTable({
    eventId: v.id("events"),
    authorUserId: v.string(),

    subject: v.string(),
    body: v.string(),

    channel: v.union(
      v.literal("event_page"),
      v.literal("email")
    ),
    audience: v.union(
      v.literal("all"),
      v.literal("checked_in"),
      v.literal("not_checked_in"),
      v.literal("vip")
    ),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),

    createdAt: v.float64(),
    updatedAt: v.float64(),
    publishedAt: v.optional(v.float64()),
  })
    .index("by_event_created", ["eventId", "createdAt"])
    .index("by_event_status", ["eventId", "status"]),

  ticketAddOns: defineTable({
    eventId: v.id("events"),

    name: v.string(),
    description: v.optional(v.string()),

    price: v.float64(),

    quantity: v.optional(v.float64()),

    isRequired: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    isSoldOut: v.optional(v.boolean()),

    createdAt: v.optional(v.float64()),
  })
    .index("by_event", ["eventId"]),



  discountCodes: defineTable({
    eventId: v.id("events"),

    code: v.string(),
    normalizedCode: v.string(),

    discountType: v.union(
      v.literal("percentage"),
      v.literal("fixed")
    ),

    discountValue: v.float64(),

    isActive: v.boolean(),

    startsAt: v.optional(v.float64()),
    expiresAt: v.optional(v.float64()),

    maxRedemptions: v.optional(v.float64()),
    redemptionCount: v.float64(),

    minimumQuantity: v.optional(v.float64()),

    ticketTypeIds: v.optional(
      v.array(v.id("ticketTypes"))
    ),

    createdBy: v.string(),

    createdAt: v.float64(),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_event", ["eventId"])
    .index("by_event_code", ["eventId", "normalizedCode"]),


  merch: defineTable({
    eventId: v.id("events"),

    organizerId: v.optional(v.string()),

    name: v.string(),
    description: v.optional(v.string()),

    sku: v.optional(v.string()),
    productType: v.optional(v.string()),
    currency: v.optional(v.string()),
    unitCost: v.optional(v.float64()),
    shippingFee: v.optional(v.float64()),
    printfulVariantId: v.optional(v.float64()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
    fulfillmentMethod: v.optional(
      v.union(
        v.literal("pickup"),
        v.literal("shipping"),
        v.literal("hybrid"),
        v.literal("printful")
      )
    ),
    preorderCutoffAt: v.optional(v.float64()),

    price: v.float64(),
    inventory: v.optional(v.float64()),
    reserved: v.optional(v.float64()),
    sold: v.optional(v.float64()),

    sizes: v.optional(v.array(v.string())),

    featured: v.optional(v.boolean()),
    limitedDrop: v.optional(v.boolean()),
    pickupAtEvent: v.optional(v.boolean()),

    isActive: v.optional(v.boolean()),
    isPreorder: v.optional(v.boolean()),

    imageStorageId: v.optional(v.id("_storage")),
    imageUrl: v.optional(v.string()),

    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_organizerId", ["organizerId"]),

  merchVariants: defineTable({
    merchId: v.id("merch"),
    name: v.string(),
    sku: v.string(),
    optionValues: v.optional(v.array(v.string())),
    price: v.float64(),
    unitCost: v.optional(v.float64()),
    inventory: v.float64(),
    reserved: v.float64(),
    sold: v.float64(),
    printfulVariantId: v.optional(v.float64()),
    isActive: v.boolean(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_merchId", ["merchId"])
    .index("by_sku", ["sku"]),

  merchOrders: defineTable({
    merchId: v.id("merch"),
    userId: v.string(),

    quantity: v.float64(),
    total: v.float64(),

    eventId: v.optional(v.id("events")),
    organizerId: v.optional(v.string()),
    buyerEmail: v.optional(v.string()),
    buyerName: v.optional(v.string()),
    currency: v.optional(v.string()),
    subtotal: v.optional(v.float64()),
    shippingAmount: v.optional(v.float64()),
    taxAmount: v.optional(v.float64()),
    refundedAmount: v.optional(v.float64()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("paid"),
        v.literal("cancelled"),
        v.literal("partially_refunded"),
        v.literal("refunded")
      )
    ),
    fulfillmentStatus: v.optional(
      v.union(
        v.literal("unfulfilled"),
        v.literal("processing"),
        v.literal("ready_for_pickup"),
        v.literal("shipped"),
        v.literal("fulfilled"),
        v.literal("cancelled")
      )
    ),
    fulfillmentMethod: v.optional(v.string()),
    shippingName: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    shippingLine1: v.optional(v.string()),
    shippingLine2: v.optional(v.string()),
    shippingCity: v.optional(v.string()),
    shippingState: v.optional(v.string()),
    shippingPostalCode: v.optional(v.string()),
    shippingCountry: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paidAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
    printfulOrderId: v.optional(v.string()),
    printfulStatus: v.optional(v.string()),
    printfulError: v.optional(v.string()),

    createdAt: v.optional(v.float64()),
  })
    .index("by_merchId", ["merchId"])
    .index("by_userId", ["userId"])
    .index("by_organizerId", ["organizerId"])
    .index("by_eventId", ["eventId"])
    .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),

  merchOrderItems: defineTable({
    orderId: v.id("merchOrders"),
    merchId: v.id("merch"),
    variantId: v.optional(v.id("merchVariants")),
    productName: v.string(),
    variantName: v.optional(v.string()),
    sku: v.optional(v.string()),
    quantity: v.float64(),
    unitPrice: v.float64(),
    unitCost: v.optional(v.float64()),
    lineTotal: v.float64(),
    createdAt: v.float64(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_merchId", ["merchId"]),

  merchCheckoutReservations: defineTable({
    reservationId: v.string(),
    eventId: v.id("events"),
    userId: v.string(),
    buyerEmail: v.string(),
    buyerName: v.optional(v.string()),
    fulfillmentMethod: v.union(v.literal("pickup"), v.literal("shipping"), v.literal("printful")),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("released")),
    stripeCheckoutSessionId: v.optional(v.string()),
    expiresAt: v.float64(),
    createdAt: v.float64(),
    updatedAt: v.float64(),
  })
    .index("by_reservationId", ["reservationId"])
    .index("by_event", ["eventId"])
    .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"]),

  merchReservationItems: defineTable({
    reservationId: v.id("merchCheckoutReservations"),
    merchId: v.id("merch"),
    variantId: v.optional(v.id("merchVariants")),
    productName: v.string(),
    variantName: v.optional(v.string()),
    sku: v.optional(v.string()),
    quantity: v.float64(),
    unitPrice: v.float64(),
    unitCost: v.optional(v.float64()),
    createdAt: v.float64(),
  }).index("by_reservationId", ["reservationId"]),

  eventViews: defineTable({
    eventId: v.id("events"),

    userId: v.optional(v.string()),

    source: v.optional(v.string()),
    referrer: v.optional(v.string()),
    path: v.optional(v.string()),
    sessionId: v.optional(v.string()),

    createdAt: v.float64(),
  })
    .index("by_event", ["eventId"])
    .index("by_event_and_createdAt", ["eventId", "createdAt"])
    .index("by_event_and_sessionId", ["eventId", "sessionId"])
    .index("by_createdAt", ["createdAt"]),


  boostOrders: defineTable({
    eventId: v.id("events"),
    organizerId: v.string(),

    tier: v.string(),
    amount: v.float64(),

    status: v.optional(v.string()),

    durationDays: v.optional(v.float64()),
    featuredWeight: v.optional(v.float64()),

    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),

    createdAt: v.optional(v.float64()),
    updatedAt: v.optional(v.float64()),
  })
    .index("by_event", ["eventId"])
    .index("by_organizer", ["organizerId"])
    .index("by_status", ["status"]),


  savedEvents: defineTable({
    userId: v.string(),
    eventId: v.id("events"),
    createdAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_event", ["eventId"])
    .index("by_user_event", ["userId", "eventId"]),


  followedOrganizers: defineTable({
    userId: v.string(),
    organizerUserId: v.string(),
    createdAt: v.float64(),
  })
    .index("by_user", ["userId"])
    .index("by_organizer", ["organizerUserId"])
    .index("by_user_organizer", ["userId", "organizerUserId"]),


  budgetItems: defineTable({
    eventId: v.id("events"),
    userId: v.string(),

    name: v.string(),
    amount: v.float64(),

    type: v.union(
      v.literal("expense"),
      v.literal("income")
    ),

    notes: v.optional(v.string()),
    createdAt: v.float64(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_user", ["eventId", "userId"]),
});
