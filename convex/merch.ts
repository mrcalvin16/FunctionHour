import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireEventCapability, requireIdentity } from "./eventAccess";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    eventId: v.id("events"),

    name: v.string(),
    description: v.optional(v.string()),

    price: v.float64(),

    inventory: v.optional(v.float64()),
    sizes: v.optional(v.array(v.string())),

    featured: v.optional(v.boolean()),
    limitedDrop: v.optional(v.boolean()),
    pickupAtEvent: v.optional(v.boolean()),
    isPreorder: v.optional(v.boolean()),

    imageStorageId: v.optional(v.id("_storage")),
  },

  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(
      ctx,
      args.eventId,
      "manage_event",
    );

    const imageUrl = args.imageStorageId
      ? await ctx.storage.getUrl(args.imageStorageId)
      : undefined;

    return await ctx.db.insert("merch", {
      eventId: args.eventId,

      organizerId: identity.subject,

      name: args.name,
      description: args.description,

      price: args.price,
      inventory: args.inventory,
      sizes: args.sizes ?? [],

      imageStorageId: args.imageStorageId,
      imageUrl: imageUrl ?? undefined,

      featured: args.featured ?? false,
      limitedDrop: args.limitedDrop ?? false,
      pickupAtEvent: args.pickupAtEvent ?? false,

      isActive: true,
      isPreorder: args.isPreorder ?? false,

      createdAt: Date.now(),
    });
  },
});

export const getByEvent = query({
  args: {
    eventId: v.id("events"),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("merch")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .collect();
  },
});

export const getStorefront = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const products = await ctx.db
      .query("merch")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(100);
    const now = Date.now();
    const availableProducts = [];
    for (const product of products) {
      if (
        !(
          product.status === "published" ||
          (!product.status && product.isActive)
        ) ||
        (product.preorderCutoffAt && product.preorderCutoffAt <= now)
      )
        continue;
      if (product.fulfillmentMethod === "printful") continue;
      const variants = await ctx.db
        .query("merchVariants")
        .withIndex("by_merchId", (q) => q.eq("merchId", product._id))
        .take(100);
      availableProducts.push({
        ...product,
        imageUrl: product.imageStorageId
          ? await ctx.storage.getUrl(product.imageStorageId)
          : (product.imageUrl ?? null),
        available: Math.max(
          0,
          (product.inventory ?? 0) -
            (product.reserved ?? 0) -
            (product.sold ?? 0),
        ),
        variants: variants
          .filter((variant) => variant.isActive)
          .map((variant) => ({
            ...variant,
            available: Math.max(
              0,
              variant.inventory - variant.reserved - variant.sold,
            ),
          })),
      });
    }
    return {
      event: {
        _id: event._id,
        name: event.name,
        eventDate: event.eventDate,
        location: event.location,
      },
      products: availableProducts,
    };
  },
});

const checkoutItemValidator = v.object({
  merchId: v.id("merch"),
  variantId: v.optional(v.id("merchVariants")),
  quantity: v.number(),
});

function assertCheckoutSecret(secret: string) {
  const expected = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!expected || secret !== expected)
    throw new Error("Unauthorized checkout request.");
}

export const reserveCartForCheckout = mutation({
  args: {
    checkoutSecret: v.string(),
    reservationId: v.string(),
    eventId: v.id("events"),
    userId: v.string(),
    buyerEmail: v.string(),
    buyerName: v.optional(v.string()),
    fulfillmentMethod: v.union(v.literal("pickup"), v.literal("shipping")),
    items: v.array(checkoutItemValidator),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.checkoutSecret);
    if (!args.items.length || args.items.length > 20)
      throw new Error("Cart must contain between 1 and 20 items.");
    const existing = await ctx.db
      .query("merchCheckoutReservations")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId),
      )
      .unique();
    if (existing) throw new Error("Checkout reservation already exists.");
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found.");
    const now = Date.now();
    const expiresAt = now + 30 * 60 * 1_000;
    const reservationDocumentId = await ctx.db.insert(
      "merchCheckoutReservations",
      {
        reservationId: args.reservationId,
        eventId: args.eventId,
        userId: args.userId,
        buyerEmail: args.buyerEmail.trim().toLowerCase(),
        buyerName: args.buyerName?.trim(),
        fulfillmentMethod: args.fulfillmentMethod,
        status: "pending",
        expiresAt,
        createdAt: now,
        updatedAt: now,
      },
    );
    const lineItems = [];
    let shippingFee = 0;
    let printfulItems = 0;
    for (const requested of args.items) {
      const quantity = Math.floor(requested.quantity);
      if (quantity < 1 || quantity > 10)
        throw new Error("Each cart quantity must be between 1 and 10.");
      const product = await ctx.db.get(requested.merchId);
      if (
        !product ||
        product.eventId !== args.eventId ||
        !(
          product.status === "published" ||
          (!product.status && product.isActive)
        )
      )
        throw new Error("A cart product is unavailable.");
      if (product.preorderCutoffAt && product.preorderCutoffAt <= now)
        throw new Error(`${product.name} preorder sales have closed.`);
      if (
        args.fulfillmentMethod === "shipping" &&
        product.fulfillmentMethod === "pickup"
      )
        throw new Error(`${product.name} is available for event pickup only.`);
      if (
        args.fulfillmentMethod === "pickup" &&
        product.fulfillmentMethod === "shipping"
      )
        throw new Error(`${product.name} requires shipping.`);
      if (args.fulfillmentMethod === "shipping")
        shippingFee = Math.max(shippingFee, product.shippingFee ?? 0);
      if (product.fulfillmentMethod === "printful") printfulItems += 1;

      let variantName: string | undefined;
      let sku = product.sku;
      let unitPrice = product.price;
      let unitCost = product.unitCost;
      if (requested.variantId) {
        const variant = await ctx.db.get(requested.variantId);
        if (!variant || variant.merchId !== product._id || !variant.isActive)
          throw new Error("A selected variant is unavailable.");
        if (variant.inventory - variant.reserved - variant.sold < quantity)
          throw new Error(
            `Only ${Math.max(0, variant.inventory - variant.reserved - variant.sold)} ${variant.name} remaining.`,
          );
        await ctx.db.patch(variant._id, {
          reserved: variant.reserved + quantity,
          updatedAt: now,
        });
        variantName = variant.name;
        sku = variant.sku;
        unitPrice = variant.price;
        unitCost = variant.unitCost;
      } else {
        const variants = await ctx.db
          .query("merchVariants")
          .withIndex("by_merchId", (q) => q.eq("merchId", product._id))
          .take(1);
        if (variants.length)
          throw new Error(`Choose a variant for ${product.name}.`);
        const available =
          (product.inventory ?? 0) -
          (product.reserved ?? 0) -
          (product.sold ?? 0);
        if (available < quantity)
          throw new Error(
            `Only ${Math.max(0, available)} ${product.name} remaining.`,
          );
        await ctx.db.patch(product._id, {
          reserved: (product.reserved ?? 0) + quantity,
          updatedAt: now,
        });
      }
      await ctx.db.insert("merchReservationItems", {
        reservationId: reservationDocumentId,
        merchId: product._id,
        variantId: requested.variantId,
        productName: product.name,
        variantName,
        sku,
        quantity,
        unitPrice,
        unitCost,
        createdAt: now,
      });
      lineItems.push({
        merchId: product._id,
        variantId: requested.variantId ?? null,
        productName: product.name,
        variantName: variantName ?? null,
        quantity,
        unitPrice,
      });
    }
    if (printfulItems > 0 && printfulItems !== args.items.length)
      throw new Error(
        "Printful products must be checked out separately from manually fulfilled products.",
      );
    if (printfulItems === args.items.length)
      await ctx.db.patch(reservationDocumentId, {
        fulfillmentMethod: "printful",
        updatedAt: Date.now(),
      });
    return {
      reservationId: args.reservationId,
      eventName: event.name,
      expiresAt,
      lineItems,
      shippingFee,
      printful: printfulItems === args.items.length,
    };
  },
});

export const attachCheckoutSession = mutation({
  args: {
    checkoutSecret: v.string(),
    reservationId: v.string(),
    stripeCheckoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.checkoutSecret);
    const reservation = await ctx.db
      .query("merchCheckoutReservations")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId),
      )
      .unique();
    if (!reservation || reservation.status !== "pending")
      throw new Error("Active reservation not found.");
    await ctx.db.patch(reservation._id, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const releaseCheckoutReservation = mutation({
  args: {
    checkoutSecret: v.string(),
    reservationId: v.optional(v.string()),
    stripeCheckoutSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.checkoutSecret);
    const reservation = args.reservationId
      ? await ctx.db
          .query("merchCheckoutReservations")
          .withIndex("by_reservationId", (q) =>
            q.eq("reservationId", args.reservationId!),
          )
          .unique()
      : args.stripeCheckoutSessionId
        ? await ctx.db
            .query("merchCheckoutReservations")
            .withIndex("by_stripeCheckoutSessionId", (q) =>
              q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId!),
            )
            .unique()
        : null;
    if (!reservation || reservation.status !== "pending") return false;
    const items = await ctx.db
      .query("merchReservationItems")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", reservation._id),
      )
      .take(20);
    for (const item of items) {
      if (item.variantId) {
        const variant = await ctx.db.get(item.variantId);
        if (variant)
          await ctx.db.patch(variant._id, {
            reserved: Math.max(0, variant.reserved - item.quantity),
            updatedAt: Date.now(),
          });
      } else {
        const product = await ctx.db.get(item.merchId);
        if (product)
          await ctx.db.patch(product._id, {
            reserved: Math.max(0, (product.reserved ?? 0) - item.quantity),
            updatedAt: Date.now(),
          });
      }
    }
    await ctx.db.patch(reservation._id, {
      status: "released",
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const completeMerchOrder = mutation({
  args: {
    webhookSecret: v.string(),
    reservationId: v.string(),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    shippingName: v.optional(v.string()),
    shippingAddress: v.optional(v.string()),
    shippingLine1: v.optional(v.string()),
    shippingLine2: v.optional(v.string()),
    shippingCity: v.optional(v.string()),
    shippingState: v.optional(v.string()),
    shippingPostalCode: v.optional(v.string()),
    shippingCountry: v.optional(v.string()),
    shippingAmount: v.number(),
    taxAmount: v.number(),
    currency: v.string(),
    paidAt: v.number(),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.webhookSecret);
    const priorOrder = await ctx.db
      .query("merchOrders")
      .withIndex("by_stripeCheckoutSessionId", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId),
      )
      .unique();
    if (priorOrder) return priorOrder._id;
    const reservation = await ctx.db
      .query("merchCheckoutReservations")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", args.reservationId),
      )
      .unique();
    if (!reservation || reservation.status !== "pending")
      throw new Error("Active merch reservation not found.");
    const items = await ctx.db
      .query("merchReservationItems")
      .withIndex("by_reservationId", (q) =>
        q.eq("reservationId", reservation._id),
      )
      .take(20);
    if (!items.length) throw new Error("Merch reservation has no items.");
    const firstProduct = await ctx.db.get(items[0].merchId);
    if (!firstProduct?.organizerId)
      throw new Error("Merch organizer not found.");
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = subtotal + args.shippingAmount + args.taxAmount;
    const now = Date.now();
    const orderId = await ctx.db.insert("merchOrders", {
      merchId: items[0].merchId,
      eventId: reservation.eventId,
      organizerId: firstProduct.organizerId,
      userId: reservation.userId,
      buyerEmail: reservation.buyerEmail,
      buyerName: reservation.buyerName,
      quantity,
      subtotal,
      shippingAmount: args.shippingAmount,
      taxAmount: args.taxAmount,
      total,
      currency: args.currency,
      status: "paid",
      fulfillmentStatus: "unfulfilled",
      fulfillmentMethod: reservation.fulfillmentMethod,
      shippingName: args.shippingName,
      shippingAddress: args.shippingAddress,
      shippingLine1: args.shippingLine1,
      shippingLine2: args.shippingLine2,
      shippingCity: args.shippingCity,
      shippingState: args.shippingState,
      shippingPostalCode: args.shippingPostalCode,
      shippingCountry: args.shippingCountry,
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      paidAt: args.paidAt,
      createdAt: now,
      updatedAt: now,
    });
    for (const item of items) {
      await ctx.db.insert("merchOrderItems", {
        orderId,
        merchId: item.merchId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        lineTotal: item.unitPrice * item.quantity,
        createdAt: now,
      });
      if (item.variantId) {
        const variant = await ctx.db.get(item.variantId);
        if (variant)
          await ctx.db.patch(variant._id, {
            reserved: Math.max(0, variant.reserved - item.quantity),
            sold: variant.sold + item.quantity,
            updatedAt: now,
          });
      } else {
        const product = await ctx.db.get(item.merchId);
        if (product)
          await ctx.db.patch(product._id, {
            reserved: Math.max(0, (product.reserved ?? 0) - item.quantity),
            sold: (product.sold ?? 0) + item.quantity,
            updatedAt: now,
          });
      }
    }
    await ctx.db.patch(reservation._id, {
      status: "completed",
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
      updatedAt: now,
    });
    return orderId;
  },
});

export const recordMerchRefund = mutation({
  args: {
    webhookSecret: v.string(),
    stripePaymentIntentId: v.string(),
    refundedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.webhookSecret);
    const order = await ctx.db
      .query("merchOrders")
      .withIndex("by_stripePaymentIntentId", (q) =>
        q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
      )
      .unique();
    if (!order) return false;
    const refundedAmount = Math.min(
      order.total,
      Math.max(0, args.refundedAmount),
    );
    const fullyRefunded = refundedAmount >= order.total;
    const wasRefunded = order.status === "refunded";
    await ctx.db.patch(order._id, {
      refundedAmount,
      status: fullyRefunded ? "refunded" : "partially_refunded",
      fulfillmentStatus:
        fullyRefunded &&
        (!order.fulfillmentStatus ||
          ["unfulfilled", "processing", "ready_for_pickup"].includes(
            order.fulfillmentStatus,
          ))
          ? "cancelled"
          : order.fulfillmentStatus,
      updatedAt: Date.now(),
    });
    if (
      !fullyRefunded ||
      wasRefunded ||
      ["shipped", "fulfilled"].includes(order.fulfillmentStatus ?? "")
    )
      return true;
    const items = await ctx.db
      .query("merchOrderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);
    for (const item of items) {
      if (item.variantId) {
        const variant = await ctx.db.get(item.variantId);
        if (variant)
          await ctx.db.patch(variant._id, {
            sold: Math.max(0, variant.sold - item.quantity),
            updatedAt: Date.now(),
          });
      } else {
        const product = await ctx.db.get(item.merchId);
        if (product)
          await ctx.db.patch(product._id, {
            sold: Math.max(0, (product.sold ?? 0) - item.quantity),
            updatedAt: Date.now(),
          });
      }
    }
    return true;
  },
});

export const updateMerch = mutation({
  args: {
    merchId: v.id("merch"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.float64()),
    inventory: v.optional(v.float64()),
    sizes: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
    isPreorder: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const merch = await ctx.db.get(args.merchId);

    if (!merch) {
      throw new Error("Merch item not found.");
    }

    const event = await ctx.db.get(merch.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    if (
      event.userId !== identity.subject &&
      event.organizerId !== identity.subject
    ) {
      throw new Error("You do not have permission to edit this merch.");
    }

    const { merchId, ...updates } = args;

    await ctx.db.patch(merchId, updates);

    return true;
  },
});

export const deleteMerch = mutation({
  args: {
    merchId: v.id("merch"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("You must be signed in.");
    }

    const merch = await ctx.db.get(args.merchId);

    if (!merch) {
      throw new Error("Merch item not found.");
    }

    const event = await ctx.db.get(merch.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    if (
      event.userId !== identity.subject &&
      event.organizerId !== identity.subject
    ) {
      throw new Error("You do not have permission to delete this merch.");
    }

    const orderItem = await ctx.db
      .query("merchOrderItems")
      .withIndex("by_merchId", (q) => q.eq("merchId", args.merchId))
      .first();
    const variants = await ctx.db
      .query("merchVariants")
      .withIndex("by_merchId", (q) => q.eq("merchId", args.merchId))
      .take(100);
    if (orderItem) {
      await ctx.db.patch(args.merchId, {
        status: "archived",
        isActive: false,
        updatedAt: Date.now(),
      });
      for (const variant of variants)
        await ctx.db.patch(variant._id, {
          isActive: false,
          updatedAt: Date.now(),
        });
      return true;
    }
    for (const variant of variants) await ctx.db.delete(variant._id);
    await ctx.db.delete(args.merchId);

    return true;
  },
});

export const getById = query({
  args: {
    merchId: v.id("merch"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.merchId);

    if (!item) {
      return null;
    }

    const imageUrl = item.imageStorageId
      ? await ctx.storage.getUrl(item.imageStorageId)
      : (item.imageUrl ?? null);

    return {
      ...item,
      imageUrl,
    };
  },
});

const fulfillmentValidator = v.union(
  v.literal("pickup"),
  v.literal("shipping"),
  v.literal("hybrid"),
  v.literal("printful"),
);

const productStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived"),
);

export const createProduct = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.optional(v.string()),
    sku: v.string(),
    productType: v.string(),
    price: v.float64(),
    unitCost: v.optional(v.float64()),
    shippingFee: v.optional(v.float64()),
    inventory: v.float64(),
    status: productStatusValidator,
    fulfillmentMethod: fulfillmentValidator,
    preorderCutoffAt: v.optional(v.float64()),
    featured: v.boolean(),
    limitedDrop: v.boolean(),
    imageStorageId: v.optional(v.id("_storage")),
    variants: v.array(
      v.object({
        name: v.string(),
        sku: v.string(),
        optionValues: v.array(v.string()),
        price: v.float64(),
        unitCost: v.optional(v.float64()),
        printfulVariantId: v.optional(v.float64()),
        inventory: v.float64(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { identity } = await requireEventCapability(
      ctx,
      args.eventId,
      "manage_event",
    );
    const name = args.name.trim().slice(0, 120);
    const sku = args.sku.trim().toUpperCase().slice(0, 64);
    if (!name || !sku) throw new Error("Product name and SKU are required.");
    if (
      args.price < 0 ||
      args.inventory < 0 ||
      (args.unitCost ?? 0) < 0 ||
      (args.shippingFee ?? 0) < 0
    )
      throw new Error("Prices and inventory cannot be negative.");
    if (args.variants.length > 100)
      throw new Error("A product can have up to 100 variants.");

    const duplicate = await ctx.db
      .query("merchVariants")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .first();
    if (duplicate) throw new Error("That SKU is already in use.");
    const imageUrl = args.imageStorageId
      ? await ctx.storage.getUrl(args.imageStorageId)
      : undefined;
    const now = Date.now();
    const merchId = await ctx.db.insert("merch", {
      eventId: args.eventId,
      organizerId: identity.subject,
      name,
      description: args.description?.trim().slice(0, 2_000),
      sku,
      productType: args.productType.trim().slice(0, 80),
      currency: "usd",
      price: args.price,
      unitCost: args.unitCost,
      shippingFee: args.shippingFee,
      inventory: args.inventory,
      status: args.status,
      fulfillmentMethod: args.fulfillmentMethod,
      preorderCutoffAt: args.preorderCutoffAt,
      featured: args.featured,
      limitedDrop: args.limitedDrop,
      pickupAtEvent:
        args.fulfillmentMethod === "pickup" ||
        args.fulfillmentMethod === "hybrid",
      isActive: args.status === "published",
      isPreorder: Boolean(args.preorderCutoffAt),
      imageStorageId: args.imageStorageId,
      imageUrl: imageUrl ?? undefined,
      createdAt: now,
      updatedAt: now,
    });

    for (const variant of args.variants) {
      const variantSku = variant.sku.trim().toUpperCase().slice(0, 64);
      if (
        !variant.name.trim() ||
        !variantSku ||
        variant.price < 0 ||
        variant.inventory < 0
      )
        throw new Error(
          "Each variant needs a valid name, SKU, price, and inventory.",
        );
      const existingSku = await ctx.db
        .query("merchVariants")
        .withIndex("by_sku", (q) => q.eq("sku", variantSku))
        .first();
      if (existingSku) throw new Error(`SKU ${variantSku} is already in use.`);
      await ctx.db.insert("merchVariants", {
        merchId,
        name: variant.name.trim().slice(0, 100),
        sku: variantSku,
        optionValues: variant.optionValues
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 10),
        price: variant.price,
        unitCost: variant.unitCost,
        printfulVariantId: variant.printfulVariantId,
        inventory: variant.inventory,
        reserved: 0,
        sold: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return merchId;
  },
});

export const getOrganizerWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(100);
    const products = [];
    for (const event of events) {
      const eventProducts = await ctx.db
        .query("merch")
        .withIndex("by_eventId", (q) => q.eq("eventId", event._id))
        .order("desc")
        .take(250);
      for (const product of eventProducts) {
        const variants = await ctx.db
          .query("merchVariants")
          .withIndex("by_merchId", (q) => q.eq("merchId", product._id))
          .take(100);
        products.push({ ...product, eventName: event.name, variants });
      }
    }
    const orders = await ctx.db
      .query("merchOrders")
      .withIndex("by_organizerId", (q) => q.eq("organizerId", identity.subject))
      .order("desc")
      .take(250);
    const grossRevenue = orders
      .filter((order) =>
        ["paid", "partially_refunded", "refunded"].includes(order.status ?? ""),
      )
      .reduce((sum, order) => sum + order.total, 0);
    const refunds = orders.reduce(
      (sum, order) => sum + (order.refundedAmount ?? 0),
      0,
    );
    const revenue = grossRevenue - refunds;
    let costOfGoods = 0;
    for (const order of orders) {
      if (
        !order.status ||
        !["paid", "partially_refunded"].includes(order.status)
      )
        continue;
      const items = await ctx.db
        .query("merchOrderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .take(20);
      costOfGoods += items.reduce(
        (sum, item) => sum + (item.unitCost ?? 0) * item.quantity,
        0,
      );
    }
    const inventory = products.reduce(
      (sum, product) =>
        sum +
        (product.variants.length
          ? product.variants.reduce(
              (variantSum, variant) =>
                variantSum +
                Math.max(
                  0,
                  variant.inventory - variant.reserved - variant.sold,
                ),
              0,
            )
          : Math.max(0, product.inventory ?? 0)),
      0,
    );
    return {
      products,
      orders,
      summary: {
        products: products.length,
        published: products.filter(
          (product) => product.status === "published" || product.isActive,
        ).length,
        orders: orders.length,
        revenue: Math.round(revenue * 100) / 100,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        refunds: Math.round(refunds * 100) / 100,
        costOfGoods: Math.round(costOfGoods * 100) / 100,
        profit: Math.round((revenue - costOfGoods) * 100) / 100,
        inventory,
        unfulfilled: orders.filter(
          (order) =>
            order.status === "paid" &&
            (!order.fulfillmentStatus ||
              order.fulfillmentStatus === "unfulfilled"),
        ).length,
      },
    };
  },
});

export const updateFulfillment = mutation({
  args: {
    orderId: v.id("merchOrders"),
    fulfillmentStatus: v.union(
      v.literal("unfulfilled"),
      v.literal("processing"),
      v.literal("ready_for_pickup"),
      v.literal("shipped"),
      v.literal("fulfilled"),
      v.literal("cancelled"),
    ),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.organizerId !== identity.subject)
      throw new Error("Order not found or access denied.");
    await ctx.db.patch(args.orderId, {
      fulfillmentStatus: args.fulfillmentStatus,
      trackingNumber: args.trackingNumber?.trim().slice(0, 120),
      trackingUrl: args.trackingUrl?.trim().slice(0, 500),
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const getProductEditor = query({
  args: { merchId: v.id("merch") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.merchId);
    if (!product) return null;
    await requireEventCapability(ctx, product.eventId, "manage_event");
    const variants = await ctx.db
      .query("merchVariants")
      .withIndex("by_merchId", (q) => q.eq("merchId", product._id))
      .take(100);
    return { ...product, variants };
  },
});

export const updateProduct = mutation({
  args: {
    merchId: v.id("merch"),
    name: v.string(),
    description: v.optional(v.string()),
    sku: v.string(),
    productType: v.string(),
    price: v.number(),
    unitCost: v.optional(v.number()),
    shippingFee: v.optional(v.number()),
    inventory: v.number(),
    status: productStatusValidator,
    fulfillmentMethod: fulfillmentValidator,
    preorderCutoffAt: v.optional(v.number()),
    featured: v.boolean(),
    limitedDrop: v.boolean(),
    variants: v.array(
      v.object({
        variantId: v.optional(v.id("merchVariants")),
        name: v.string(),
        sku: v.string(),
        price: v.number(),
        unitCost: v.optional(v.number()),
        printfulVariantId: v.optional(v.number()),
        inventory: v.number(),
        isActive: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.merchId);
    if (!product) throw new Error("Product not found.");
    await requireEventCapability(ctx, product.eventId, "manage_event");
    if (
      !args.name.trim() ||
      !args.sku.trim() ||
      args.price < 0 ||
      args.inventory < (product.reserved ?? 0) + (product.sold ?? 0)
    )
      throw new Error(
        "Enter valid product details. Inventory cannot be below reserved and sold units.",
      );
    const now = Date.now();
    await ctx.db.patch(product._id, {
      name: args.name.trim().slice(0, 120),
      description: args.description?.trim().slice(0, 2_000),
      sku: args.sku.trim().toUpperCase().slice(0, 64),
      productType: args.productType.trim().slice(0, 80),
      price: args.price,
      unitCost: args.unitCost,
      shippingFee: args.shippingFee,
      inventory: args.inventory,
      status: args.status,
      fulfillmentMethod: args.fulfillmentMethod,
      preorderCutoffAt: args.preorderCutoffAt,
      featured: args.featured,
      limitedDrop: args.limitedDrop,
      pickupAtEvent: ["pickup", "hybrid"].includes(args.fulfillmentMethod),
      isActive: args.status === "published",
      isPreorder: Boolean(args.preorderCutoffAt),
      updatedAt: now,
    });
    const retained = new Set<string>();
    for (const input of args.variants) {
      const sku = input.sku.trim().toUpperCase().slice(0, 64);
      if (!input.name.trim() || !sku || input.price < 0 || input.inventory < 0)
        throw new Error("Every variant needs valid details.");
      if (input.variantId) {
        const variant = await ctx.db.get(input.variantId);
        if (!variant || variant.merchId !== product._id)
          throw new Error("Variant not found.");
        if (input.inventory < variant.reserved + variant.sold)
          throw new Error(
            `${variant.name} inventory cannot be below reserved and sold units.`,
          );
        const duplicate = await ctx.db
          .query("merchVariants")
          .withIndex("by_sku", (q) => q.eq("sku", sku))
          .first();
        if (duplicate && duplicate._id !== variant._id)
          throw new Error(`SKU ${sku} is already in use.`);
        await ctx.db.patch(variant._id, {
          name: input.name.trim().slice(0, 100),
          sku,
          price: input.price,
          unitCost: input.unitCost,
          printfulVariantId: input.printfulVariantId,
          inventory: input.inventory,
          isActive: input.isActive,
          updatedAt: now,
        });
        retained.add(String(variant._id));
      } else {
        const duplicate = await ctx.db
          .query("merchVariants")
          .withIndex("by_sku", (q) => q.eq("sku", sku))
          .first();
        if (duplicate) throw new Error(`SKU ${sku} is already in use.`);
        const id = await ctx.db.insert("merchVariants", {
          merchId: product._id,
          name: input.name.trim().slice(0, 100),
          sku,
          price: input.price,
          unitCost: input.unitCost,
          printfulVariantId: input.printfulVariantId,
          inventory: input.inventory,
          reserved: 0,
          sold: 0,
          isActive: input.isActive,
          createdAt: now,
          updatedAt: now,
        });
        retained.add(String(id));
      }
    }
    const existingVariants = await ctx.db
      .query("merchVariants")
      .withIndex("by_merchId", (q) => q.eq("merchId", product._id))
      .take(100);
    for (const variant of existingVariants)
      if (!retained.has(String(variant._id)) && variant.isActive)
        await ctx.db.patch(variant._id, { isActive: false, updatedAt: now });
    return true;
  },
});

export const getOrganizerOrder = query({
  args: { orderId: v.id("merchOrders") },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.organizerId !== identity.subject) return null;
    const items = await ctx.db
      .query("merchOrderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);
    const event = order.eventId ? await ctx.db.get(order.eventId) : null;
    return { ...order, items, eventName: event?.name ?? "Event" };
  },
});

export const getMyMerchOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const orders = await ctx.db
      .query("merchOrders")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(100);
    return Promise.all(orders.map(async (order) => {
      const items = await ctx.db
        .query("merchOrderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .take(20);
      const event = order.eventId ? await ctx.db.get(order.eventId) : null;
      return {
        _id: order._id,
        paidAt: order.paidAt ?? order.createdAt ?? 0,
        total: order.total,
        currency: order.currency ?? "usd",
        status: order.status ?? "pending",
        fulfillmentStatus: order.fulfillmentStatus ?? "unfulfilled",
        fulfillmentMethod: order.fulfillmentMethod ?? "pickup",
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        eventName: event?.name ?? "Function Hour event",
        eventLocation: event?.location,
        items: items.map((item) => ({
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
        })),
      };
    }));
  },
});

export const getPrintfulOrderPayload = query({
  args: { serverSecret: v.string(), orderId: v.id("merchOrders") },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.serverSecret);
    const order = await ctx.db.get(args.orderId);
    if (
      !order ||
      order.fulfillmentMethod !== "printful" ||
      order.status !== "paid"
    )
      return null;
    if (
      !order.shippingLine1 ||
      !order.shippingCity ||
      !order.shippingPostalCode ||
      !order.shippingCountry
    )
      throw new Error("Printful order is missing a complete shipping address.");
    const items = await ctx.db
      .query("merchOrderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .take(20);
    const printfulItems = [];
    for (const item of items) {
      const product = await ctx.db.get(item.merchId);
      const variant = item.variantId ? await ctx.db.get(item.variantId) : null;
      const variantId =
        variant?.printfulVariantId ?? product?.printfulVariantId;
      if (!variantId)
        throw new Error(
          `${item.productName} is missing a Printful variant ID.`,
        );
      printfulItems.push({
        variantId,
        quantity: item.quantity,
        retailPrice: item.unitPrice.toFixed(2),
        name: item.productName,
      });
    }
    return {
      externalId: String(order._id),
      recipient: {
        name: order.shippingName ?? order.buyerName ?? "Customer",
        address1: order.shippingLine1,
        address2: order.shippingLine2 ?? "",
        city: order.shippingCity,
        stateCode: order.shippingState ?? "",
        zip: order.shippingPostalCode,
        countryCode: order.shippingCountry,
        email: order.buyerEmail ?? "",
      },
      items: printfulItems,
    };
  },
});

export const recordPrintfulSubmission = mutation({
  args: {
    serverSecret: v.string(),
    orderId: v.id("merchOrders"),
    printfulOrderId: v.optional(v.string()),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.serverSecret);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found.");
    await ctx.db.patch(order._id, {
      printfulOrderId: args.printfulOrderId,
      printfulStatus: args.status.slice(0, 80),
      printfulError: args.error?.slice(0, 500),
      fulfillmentStatus: args.error ? order.fulfillmentStatus : "processing",
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const getPrintfulSyncRecord = query({
  args: {
    serverSecret: v.string(),
    orderId: v.id("merchOrders"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.serverSecret);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.organizerId !== args.clerkId) return null;
    if (order.fulfillmentMethod !== "printful" || !order.printfulOrderId)
      return null;
    return { printfulOrderId: order.printfulOrderId };
  },
});

export const recordPrintfulShipment = mutation({
  args: {
    serverSecret: v.string(),
    orderId: v.id("merchOrders"),
    clerkId: v.string(),
    printfulStatus: v.string(),
    trackingNumber: v.optional(v.string()),
    trackingUrl: v.optional(v.string()),
    shipped: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertCheckoutSecret(args.serverSecret);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.organizerId !== args.clerkId)
      throw new Error("Order not found.");
    await ctx.db.patch(order._id, {
      printfulStatus: args.printfulStatus.slice(0, 80),
      printfulError: undefined,
      trackingNumber: args.trackingNumber?.slice(0, 150),
      trackingUrl: args.trackingUrl?.slice(0, 500),
      fulfillmentStatus: args.shipped ? "shipped" : order.fulfillmentStatus,
      updatedAt: Date.now(),
    });
    return true;
  },
});
