import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  classifyTrafficSource,
  trafficSourceLabels,
  type TrafficSourceKey,
} from "./analyticsSources";
import { requireEventCapability } from "./eventAccess";

type OrganizerActivityKind =
  | "sale"
  | "check_in"
  | "comp"
  | "boost";

type OrganizerActivityItem = {
  id: string;
  kind: OrganizerActivityKind;
  title: string;
  detail: string;
  occurredAt: number;
  eventId: Id<"events">;
  eventName: string;
  href: string;
};

function percentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(
    ((current - previous) / previous) * 100
  );
}

function analyticsDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

const excludedSaleStatuses = new Set([
  "refunded",
  "revoked",
  "cancelled",
  "canceled",
]);

const trafficSourceOrder: TrafficSourceKey[] = [
  "direct",
  "instagram",
  "tiktok",
  "facebook",
  "search",
  "email",
  "referral",
];

function isPaidTicket(ticket: Doc<"tickets">): boolean {
  const status =
    ticket.status?.toLowerCase() ?? "active";

  return (
    ticket.ticketSource !== "complimentary" &&
    ticket.ticketSource !== "manual" &&
    !excludedSaleStatuses.has(status)
  );
}

function ticketQuantity(
  ticket: Doc<"tickets">
): number {
  return Math.max(
    1,
    Math.floor(ticket.quantity ?? 1)
  );
}

function ticketUnitPrice(
  ticket: Doc<"tickets">,
  event: Doc<"events">
): number {
  return ticket.unitPrice ?? event.price ?? 0;
}

function ticketBuyerKey(
  ticket: Doc<"tickets">
): string {
  return (
    ticket.buyerEmail?.trim().toLowerCase() ||
    String(ticket.userId)
  );
}

export const getOrganizerAnalytics = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        grossSales: 0,
        ticketsSold: 0,
        upcomingEvents: 0,
        totalPageViews: 0,
        totalConversionRate: 0,
        bestSellingCount: 0,
        totalRevenue: 0,
        reconciliation: {
          grossAmount: 0,
          platformFeeAmount: 0,
          refundedAmount: 0,
          netAmount: 0,
          paidOrders: 0,
          partiallyRefundedOrders: 0,
          refundedOrders: 0,
          trackedOrders: 0,
          firstTrackedAt: null,
          currency: "usd",
          payoutStatus: "not_connected" as const,
        },
        totalTicketsSold: 0,
        totalEvents: 0,
        salesByEvent: [],
        recentSales: [],
        trafficSources: [],
        funnel: {
          periodDays: 30,
          purchaseRate: 0,
          checkInRate: 0,
          stages: [
            {
              key: "views",
              label: "Event views",
              value: 0,
            },
            {
              key: "buyers",
              label: "Ticket buyers",
              value: 0,
            },
            {
              key: "checked_in",
              label: "Checked-in buyers",
              value: 0,
            },
          ],
        },
        trafficWindowDays: 30,
        isRevenueEstimated: false,
      };
    }

    const now = Date.now();
    const analyticsWindowDays = 30;
    const windowStart =
      now -
      analyticsWindowDays * 24 * 60 * 60 * 1000;
    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.subject)
      )
      .order("desc")
      .take(50);

    const eventAnalytics = await Promise.all(
      events.map(async (event) => {
        const [tickets, views] = await Promise.all([
          ctx.db
            .query("tickets")
            .withIndex(
              "by_event_and_purchasedAt",
              (q) => q.eq("eventId", event._id)
            )
            .order("desc")
            .take(500),
          ctx.db
            .query("eventViews")
            .withIndex(
              "by_event_and_createdAt",
              (q) =>
                q
                  .eq("eventId", event._id)
                  .gte("createdAt", windowStart)
            )
            .order("desc")
            .take(2_000),
        ]);
        const paidTickets = tickets.filter(isPaidTicket);
        const sampledTicketsSold = paidTickets.reduce(
          (sum, ticket) =>
            sum + ticketQuantity(ticket),
          0
        );
        const ticketsSold = Math.max(
          sampledTicketsSold,
          Math.floor(event.ticketsSold ?? 0)
        );
        const sampledRevenue = paidTickets.reduce(
          (sum, ticket) =>
            sum +
            ticketUnitPrice(ticket, event) *
              ticketQuantity(ticket),
          0
        );
        const unsampledTickets = Math.max(
          0,
          ticketsSold - sampledTicketsSold
        );
        const revenue =
          sampledRevenue +
          unsampledTickets * (event.price ?? 0);
        const periodTickets = paidTickets.filter(
          (ticket) =>
            (ticket.purchasedAt ?? 0) >= windowStart &&
            (ticket.purchasedAt ?? 0) <= now
        );
        const buyers = new Set(
          periodTickets.map(ticketBuyerKey)
        );
        const checkedInBuyers = new Set(
          periodTickets
            .filter((ticket) => ticket.checkedIn)
            .map(ticketBuyerKey)
        );
        const sources: Record<TrafficSourceKey, number> = {
          direct: 0,
          instagram: 0,
          tiktok: 0,
          facebook: 0,
          search: 0,
          email: 0,
          referral: 0,
        };

        for (const view of views) {
          const source = classifyTrafficSource(
            view.source,
            view.referrer
          );

          sources[source] += 1;
        }

        const saleGroups = new Map<
          string,
          {
            ticketId: string;
            eventId: Id<"events">;
            eventName: string;
            buyerEmail: string;
            ticketType: string;
            quantity: number;
            amount: number;
            occurredAt: number;
          }
        >();

        for (const ticket of paidTickets) {
          const occurredAt =
            ticket.purchasedAt ??
            ticket.createdAt ??
            ticket._creationTime;
          const groupKey =
            ticket.stripeCheckoutSessionId ??
            String(ticket._id);
          const existing = saleGroups.get(groupKey);
          const quantity = ticketQuantity(ticket);
          const amount =
            ticketUnitPrice(ticket, event) * quantity;

          if (existing) {
            existing.quantity += quantity;
            existing.amount += amount;
            existing.occurredAt = Math.max(
              existing.occurredAt,
              occurredAt
            );
            continue;
          }

          saleGroups.set(groupKey, {
            ticketId: String(ticket._id),
            eventId: event._id,
            eventName: event.name,
            buyerEmail:
              ticket.buyerEmail ??
              String(ticket.userId),
            ticketType:
              ticket.ticketTypeName ??
              "General Admission",
            quantity,
            amount,
            occurredAt,
          });
        }

        return {
          sales: {
            eventId: event._id,
            name: event.name,
            price: event.price ?? 0,
            ticketsSold,
            revenue:
              Math.round(revenue * 100) / 100,
            pageViews: views.length,
          },
          recentSales: [...saleGroups.values()],
          pageViews: views.length,
          buyers: buyers.size,
          checkedInBuyers: checkedInBuyers.size,
          sources,
          isRevenueEstimated: unsampledTickets > 0,
        };
      })
    );

    const salesByEvent = eventAnalytics
      .map((item) => item.sales)
      .sort((a, b) => b.revenue - a.revenue);
    const totalTicketsSold = salesByEvent.reduce(
      (sum, event) => sum + event.ticketsSold,
      0
    );
    const totalRevenue = salesByEvent.reduce(
      (sum, event) => sum + event.revenue,
      0
    );
    const totalPageViews = eventAnalytics.reduce(
      (sum, event) => sum + event.pageViews,
      0
    );
    const totalBuyers = eventAnalytics.reduce(
      (sum, event) => sum + event.buyers,
      0
    );
    const totalCheckedInBuyers = eventAnalytics.reduce(
      (sum, event) => sum + event.checkedInBuyers,
      0
    );

    const bestSellingCount =
      salesByEvent.length > 0
        ? Math.max(...salesByEvent.map((event) => event.ticketsSold))
        : 0;

    const totalConversionRate =
      totalPageViews > 0
        ? Math.round(
            (totalBuyers / totalPageViews) * 1_000
          ) / 10
        : 0;
    const checkInRate =
      totalBuyers > 0
        ? Math.round(
            (totalCheckedInBuyers / totalBuyers) *
              1_000
          ) / 10
        : 0;
    const trafficSources = trafficSourceOrder.map(
      (source) => ({
        key: source,
        label: trafficSourceLabels[source],
        value: eventAnalytics.reduce(
          (sum, event) =>
            sum + event.sources[source],
          0
        ),
      })
    );
    const recentSales = eventAnalytics
      .flatMap((event) => event.recentSales)
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, 10);

    return {
      grossSales:
        Math.round(totalRevenue * 100) / 100,
      ticketsSold: totalTicketsSold,
      upcomingEvents: events.filter(
        (event) => event.eventDate >= now
      ).length,
      totalEvents: events.length,
      totalTicketsSold,
      totalRevenue:
        Math.round(totalRevenue * 100) / 100,
      totalPageViews,
      totalConversionRate,
      bestSellingCount,
      salesByEvent: salesByEvent.slice(0, 8),
      recentSales,
      trafficSources,
      funnel: {
        periodDays: analyticsWindowDays,
        purchaseRate: totalConversionRate,
        checkInRate,
        stages: [
          {
            key: "views",
            label: "Event views",
            value: totalPageViews,
          },
          {
            key: "buyers",
            label: "Ticket buyers",
            value: totalBuyers,
          },
          {
            key: "checked_in",
            label: "Checked-in buyers",
            value: totalCheckedInBuyers,
          },
        ],
      },
      trafficWindowDays: analyticsWindowDays,
      isRevenueEstimated: eventAnalytics.some(
        (event) => event.isRevenueEstimated
      ),
    };
  },
});

export const getOrganizerRatingSummary = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        averageRating: 0,
        ratingCount: 0,
        ratedEvents: 0,
      };
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.subject)
      )
      .take(100);

    const summary = events.reduce(
      (result, event) => ({
        ratingTotal:
          result.ratingTotal +
          (event.ratingTotal ?? 0),
        ratingCount:
          result.ratingCount +
          (event.ratingCount ?? 0),
        ratedEvents:
          result.ratedEvents +
          ((event.ratingCount ?? 0) > 0 ? 1 : 0),
      }),
      {
        ratingTotal: 0,
        ratingCount: 0,
        ratedEvents: 0,
      }
    );

    return {
      averageRating:
        summary.ratingCount > 0
          ? Math.round(
              (summary.ratingTotal /
                summary.ratingCount) *
                10
            ) / 10
          : 0,
      ratingCount: summary.ratingCount,
      ratedEvents: summary.ratedEvents,
    };
  },
});

export const getOrganizerTrendSeries = query({
  args: {
    days: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const requestedDays = Math.floor(args.days ?? 14);
    const days = [7, 14, 30].includes(requestedDays)
      ? requestedDays
      : 14;
    const dayInMilliseconds = 24 * 60 * 60 * 1000;
    const today = new Date();

    today.setUTCHours(0, 0, 0, 0);

    const startTimestamp =
      today.getTime() -
      (days - 1) * dayInMilliseconds;
    const emptySeries = Array.from(
      { length: days },
      (_, index) => {
        const timestamp =
          startTimestamp + index * dayInMilliseconds;

        return {
          date: analyticsDateKey(timestamp),
          label: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }).format(new Date(timestamp)),
          revenue: 0,
          tickets: 0,
          checkIns: 0,
        };
      }
    );

    if (!identity) {
      return {
        days,
        series: emptySeries,
        totals: {
          revenue: 0,
          tickets: 0,
          checkIns: 0,
        },
      };
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.subject)
      )
      .order("desc")
      .take(100);

    const eventSeries = await Promise.all(
      events.map(async (event) => {
        const daily = new Map<
          string,
          {
            revenue: number;
            tickets: number;
            checkIns: number;
          }
        >();

        const ticketTypes = await ctx.db
          .query("ticketTypes")
          .withIndex("by_event", (q) =>
            q.eq("eventId", event._id)
          )
          .take(100);
        const ticketTypePrices = new Map(
          ticketTypes.map((ticketType) => [
            ticketType._id,
            ticketType.price,
          ])
        );

        const tickets = ctx.db
          .query("tickets")
          .withIndex(
            "by_event_and_purchasedAt",
            (q) =>
              q
                .eq("eventId", event._id)
                .gte(
                  "purchasedAt",
                  startTimestamp
                )
          );

        for await (const ticket of tickets) {
          const normalizedStatus =
            ticket.status?.toLowerCase() ?? "active";
          const purchasedAt = ticket.purchasedAt;

          if (
            !purchasedAt ||
            purchasedAt > Date.now() ||
            ticket.ticketSource === "complimentary" ||
            ticket.ticketSource === "manual" ||
            [
              "refunded",
              "revoked",
              "cancelled",
              "canceled",
            ].includes(normalizedStatus)
          ) {
            continue;
          }

          const key = analyticsDateKey(purchasedAt);

          if (!daily.has(key)) {
            daily.set(key, {
              revenue: 0,
              tickets: 0,
              checkIns: 0,
            });
          }

          const bucket = daily.get(key)!;
          const quantity = Math.max(
            1,
            Math.floor(ticket.quantity ?? 1)
          );
          const unitPrice =
            ticket.unitPrice ??
            (ticket.ticketTypeId
              ? ticketTypePrices.get(
                  ticket.ticketTypeId
                )
              : undefined) ??
            event.price ??
            0;

          bucket.tickets += quantity;
          bucket.revenue += unitPrice * quantity;
        }

        const checkIns = ctx.db
          .query("checkInActivity")
          .withIndex("by_event_time", (q) =>
            q
              .eq("eventId", event._id)
              .gte("checkedInAt", startTimestamp)
          );

        for await (const checkIn of checkIns) {
          if (checkIn.checkedInAt > Date.now()) {
            continue;
          }

          const key = analyticsDateKey(
            checkIn.checkedInAt
          );

          if (!daily.has(key)) {
            daily.set(key, {
              revenue: 0,
              tickets: 0,
              checkIns: 0,
            });
          }

          daily.get(key)!.checkIns += Math.max(
            1,
            Math.floor(checkIn.quantity ?? 1)
          );
        }

        return daily;
      })
    );

    const series = emptySeries.map((day) => {
      const totals = eventSeries.reduce(
        (result, event) => {
          const bucket = event.get(day.date);

          if (!bucket) {
            return result;
          }

          return {
            revenue: result.revenue + bucket.revenue,
            tickets: result.tickets + bucket.tickets,
            checkIns:
              result.checkIns + bucket.checkIns,
          };
        },
        {
          revenue: 0,
          tickets: 0,
          checkIns: 0,
        }
      );

      return {
        ...day,
        revenue:
          Math.round(totals.revenue * 100) / 100,
        tickets: totals.tickets,
        checkIns: totals.checkIns,
      };
    });

    const totals = series.reduce(
      (result, day) => ({
        revenue: result.revenue + day.revenue,
        tickets: result.tickets + day.tickets,
        checkIns: result.checkIns + day.checkIns,
      }),
      {
        revenue: 0,
        tickets: 0,
        checkIns: 0,
      }
    );

    return {
      days,
      series,
      totals: {
        revenue:
          Math.round(totals.revenue * 100) / 100,
        tickets: totals.tickets,
        checkIns: totals.checkIns,
      },
    };
  },
});

export const getEventAnalyticsWorkspace = query({
  args: {
    eventId: v.id("events"),
    days: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    await requireEventCapability(
      ctx,
      args.eventId,
      "view_reports"
    );

    const event = await ctx.db.get(args.eventId);

    if (!event) {
      throw new Error("Event not found.");
    }

    const requestedDays = Math.floor(args.days ?? 14);
    const days = [7, 14, 30].includes(requestedDays)
      ? requestedDays
      : 14;
    const now = Date.now();
    const dayInMilliseconds = 24 * 60 * 60 * 1000;
    const today = new Date(now);

    today.setUTCHours(0, 0, 0, 0);

    const startTimestamp =
      today.getTime() -
      (days - 1) * dayInMilliseconds;
    const series = Array.from(
      { length: days },
      (_, index) => {
        const timestamp =
          startTimestamp + index * dayInMilliseconds;

        return {
          date: analyticsDateKey(timestamp),
          label: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }).format(new Date(timestamp)),
          revenue: 0,
          tickets: 0,
          checkIns: 0,
        };
      }
    );
    const resultLimit = 2_000;

    const [ticketTypes, tickets, views, checkIns, orders] =
      await Promise.all([
        ctx.db
          .query("ticketTypes")
          .withIndex("by_event", (q) =>
            q.eq("eventId", args.eventId)
          )
          .take(100),
        ctx.db
          .query("tickets")
          .withIndex(
            "by_event_and_purchasedAt",
            (q) =>
              q
                .eq("eventId", args.eventId)
                .gte("purchasedAt", startTimestamp)
          )
          .order("asc")
          .take(resultLimit),
        ctx.db
          .query("eventViews")
          .withIndex(
            "by_event_and_createdAt",
            (q) =>
              q
                .eq("eventId", args.eventId)
                .gte("createdAt", startTimestamp)
          )
          .order("asc")
          .take(resultLimit),
        ctx.db
          .query("checkInActivity")
          .withIndex("by_event_time", (q) =>
            q
              .eq("eventId", args.eventId)
              .gte("checkedInAt", startTimestamp)
          )
          .order("asc")
          .take(resultLimit),
        ctx.db
          .query("ticketOrders")
          .withIndex("by_event_and_paidAt", (q) =>
            q
              .eq("eventId", args.eventId)
              .gte("paidAt", startTimestamp)
          )
          .order("asc")
          .take(resultLimit),
      ]);
    const pointsByDate = new Map(
      series.map((point) => [point.date, point])
    );
    const ticketTypePrices = new Map(
      ticketTypes.map((ticketType) => [
        ticketType._id,
        ticketType.price,
      ])
    );
    const buyers = new Set<string>();
    const checkedInBuyers = new Set<string>();
    const ticketTypeTotals = new Map<
      string,
      {
        label: string;
        tickets: number;
        revenue: number;
      }
    >();
    const saleGroups = new Map<
      string,
      {
        id: string;
        ticketId: string;
        buyerEmail: string;
        ticketType: string;
        quantity: number;
        amount: number;
        occurredAt: number;
      }
    >();
    const gateTotals = new Map<
      string,
      {
        gate: string;
        checkIns: number;
        firstCheckInAt: number;
        lastCheckInAt: number;
        minuteCounts: Map<number, number>;
      }
    >();

    for (const ticket of tickets) {
      const purchasedAt = ticket.purchasedAt;

      if (
        !purchasedAt ||
        purchasedAt > now ||
        !isPaidTicket(ticket)
      ) {
        continue;
      }

      const quantity = ticketQuantity(ticket);
      const unitPrice =
        ticket.unitPrice ??
        (ticket.ticketTypeId
          ? ticketTypePrices.get(ticket.ticketTypeId)
          : undefined) ??
        event.price ??
        0;
      const amount = unitPrice * quantity;
      const buyerKey = ticketBuyerKey(ticket);
      const ticketType =
        ticket.ticketTypeName ?? "General Admission";
      const point = pointsByDate.get(
        analyticsDateKey(purchasedAt)
      );

      if (point) {
        point.tickets += quantity;
        point.revenue += amount;
      }

      buyers.add(buyerKey);

      if (ticket.checkedIn) {
        checkedInBuyers.add(buyerKey);
      }

      const ticketTypeTotal =
        ticketTypeTotals.get(ticketType) ?? {
          label: ticketType,
          tickets: 0,
          revenue: 0,
        };

      ticketTypeTotal.tickets += quantity;
      ticketTypeTotal.revenue += amount;
      ticketTypeTotals.set(ticketType, ticketTypeTotal);

      const groupKey =
        ticket.stripeCheckoutSessionId ??
        String(ticket._id);
      const existingSale = saleGroups.get(groupKey);

      if (existingSale) {
        existingSale.quantity += quantity;
        existingSale.amount += amount;
        if (existingSale.ticketType !== ticketType) {
          existingSale.ticketType = "Mixed ticket order";
        }
        existingSale.occurredAt = Math.max(
          existingSale.occurredAt,
          purchasedAt
        );
      } else {
        saleGroups.set(groupKey, {
          id: groupKey,
          ticketId: String(ticket._id),
          buyerEmail:
            ticket.buyerEmail ?? String(ticket.userId),
          ticketType,
          quantity,
          amount,
          occurredAt: purchasedAt,
        });
      }
    }

    for (const checkIn of checkIns) {
      if (checkIn.checkedInAt > now) {
        continue;
      }

      const point = pointsByDate.get(
        analyticsDateKey(checkIn.checkedInAt)
      );

      if (point) {
        point.checkIns += Math.max(
          1,
          Math.floor(checkIn.quantity ?? 1)
        );
      }

      const quantity = Math.max(
        1,
        Math.floor(checkIn.quantity ?? 1)
      );
      const gate = checkIn.gate?.trim() || "Main Gate";
      const minute = Math.floor(checkIn.checkedInAt / 60_000);
      const gateTotal = gateTotals.get(gate) ?? {
        gate,
        checkIns: 0,
        firstCheckInAt: checkIn.checkedInAt,
        lastCheckInAt: checkIn.checkedInAt,
        minuteCounts: new Map<number, number>(),
      };

      gateTotal.checkIns += quantity;
      gateTotal.firstCheckInAt = Math.min(
        gateTotal.firstCheckInAt,
        checkIn.checkedInAt
      );
      gateTotal.lastCheckInAt = Math.max(
        gateTotal.lastCheckInAt,
        checkIn.checkedInAt
      );
      gateTotal.minuteCounts.set(
        minute,
        (gateTotal.minuteCounts.get(minute) ?? 0) + quantity
      );
      gateTotals.set(gate, gateTotal);
    }

    const sourceCounts: Record<
      TrafficSourceKey,
      number
    > = {
      direct: 0,
      instagram: 0,
      tiktok: 0,
      facebook: 0,
      search: 0,
      email: 0,
      referral: 0,
    };

    for (const view of views) {
      if (view.createdAt <= now) {
        sourceCounts[
          classifyTrafficSource(
            view.source,
            view.referrer
          )
        ] += 1;
      }
    }

    const reconciliation = orders.reduce(
      (result, order) => ({
        grossAmount: result.grossAmount + order.grossAmount,
        platformFeeAmount:
          result.platformFeeAmount + (order.platformFeeAmount ?? 0),
        refundedAmount:
          result.refundedAmount + order.refundedAmount,
        netAmount: result.netAmount + order.netAmount,
        paidOrders:
          result.paidOrders + (order.status === "paid" ? 1 : 0),
        partiallyRefundedOrders:
          result.partiallyRefundedOrders +
          (order.status === "partially_refunded" ? 1 : 0),
        refundedOrders:
          result.refundedOrders +
          (order.status === "refunded" ? 1 : 0),
        firstTrackedAt: Math.min(
          result.firstTrackedAt,
          order.paidAt
        ),
      }),
      {
        grossAmount: 0,
        platformFeeAmount: 0,
        refundedAmount: 0,
        netAmount: 0,
        paidOrders: 0,
        partiallyRefundedOrders: 0,
        refundedOrders: 0,
        firstTrackedAt: Number.POSITIVE_INFINITY,
      }
    );

    const normalizedSeries = series.map((point) => ({
      ...point,
      revenue: Math.round(point.revenue * 100) / 100,
    }));
    const totals = normalizedSeries.reduce(
      (result, point) => ({
        revenue: result.revenue + point.revenue,
        tickets: result.tickets + point.tickets,
        checkIns: result.checkIns + point.checkIns,
      }),
      {
        revenue: 0,
        tickets: 0,
        checkIns: 0,
      }
    );
    const pageViews = views.filter(
      (view) => view.createdAt <= now
    ).length;
    const sold = Math.max(
      0,
      Math.floor(event.ticketsSold ?? 0)
    );
    const totalCapacity = Math.max(
      0,
      Math.floor(event.totalTickets ?? 0)
    );

    return {
      days,
      series: normalizedSeries,
      totals: {
        revenue:
          Math.round(totals.revenue * 100) / 100,
        tickets: totals.tickets,
        checkIns: totals.checkIns,
        pageViews,
        buyers: buyers.size,
      },
      funnel: {
        periodDays: days,
        purchaseRate:
          pageViews > 0
            ? Math.round(
                (buyers.size / pageViews) * 1_000
              ) / 10
            : 0,
        checkInRate:
          buyers.size > 0
            ? Math.round(
                (checkedInBuyers.size / buyers.size) *
                  1_000
              ) / 10
            : 0,
        stages: [
          {
            key: "views",
            label: "Event views",
            value: pageViews,
          },
          {
            key: "buyers",
            label: "Ticket buyers",
            value: buyers.size,
          },
          {
            key: "checked_in",
            label: "Checked-in buyers",
            value: checkedInBuyers.size,
          },
        ],
      },
      trafficSources: trafficSourceOrder.map(
        (source) => ({
          key: source,
          label: trafficSourceLabels[source],
          value: sourceCounts[source],
        })
      ),
      trafficWindowDays: days,
      ticketTypePerformance: [
        ...ticketTypeTotals.values(),
      ]
        .map((ticketType) => ({
          ...ticketType,
          revenue:
            Math.round(ticketType.revenue * 100) /
            100,
        }))
        .sort(
          (a, b) =>
            b.revenue - a.revenue ||
            b.tickets - a.tickets
        )
        .slice(0, 6),
      recentSales: [...saleGroups.values()]
        .map((sale) => ({
          ...sale,
          amount: Math.round(sale.amount * 100) / 100,
        }))
        .sort((a, b) => b.occurredAt - a.occurredAt)
        .slice(0, 8),
      gateThroughput: [...gateTotals.values()]
        .map((gate) => {
          const activeMinutes = Math.max(
            1,
            Math.ceil(
              (gate.lastCheckInAt - gate.firstCheckInAt) /
                60_000
            ) + 1
          );

          return {
            gate: gate.gate,
            checkIns: gate.checkIns,
            share:
              totals.checkIns > 0
                ? Math.round(
                    (gate.checkIns / totals.checkIns) * 1_000
                  ) / 10
                : 0,
            averagePerMinute:
              Math.round(
                (gate.checkIns / activeMinutes) * 10
              ) / 10,
            peakPerMinute: Math.max(
              0,
              ...gate.minuteCounts.values()
            ),
          };
        })
        .sort((a, b) => b.checkIns - a.checkIns)
        .slice(0, 8),
      reconciliation: {
        grossAmount:
          Math.round(reconciliation.grossAmount * 100) / 100,
        platformFeeAmount:
          Math.round(reconciliation.platformFeeAmount * 100) / 100,
        refundedAmount:
          Math.round(reconciliation.refundedAmount * 100) / 100,
        netAmount:
          Math.round(reconciliation.netAmount * 100) / 100,
        paidOrders: reconciliation.paidOrders,
        partiallyRefundedOrders:
          reconciliation.partiallyRefundedOrders,
        refundedOrders: reconciliation.refundedOrders,
        trackedOrders: orders.length,
        firstTrackedAt: Number.isFinite(
          reconciliation.firstTrackedAt
        )
          ? reconciliation.firstTrackedAt
          : null,
        currency: orders[0]?.currency ?? "usd",
        payoutStatus: "not_connected" as const,
      },
      capacity: {
        sold,
        total: totalCapacity,
        sellThrough:
          totalCapacity > 0
            ? Math.min(
                100,
                Math.round(
                  (sold / totalCapacity) * 1_000
                ) / 10
              )
            : 0,
      },
      isLimited:
        tickets.length === resultLimit ||
        views.length === resultLimit ||
        checkIns.length === resultLimit ||
        orders.length === resultLimit,
    };
  },
});

export const getOrganizerWeeklySales = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return {
        currentTickets: 0,
        previousTickets: 0,
        changePercent: 0,
      };
    }

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const currentPeriodStart = now - sevenDays;
    const previousPeriodStart = now - sevenDays * 2;

    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.subject)
      )
      .order("desc")
      .take(25);

    const eventTotals = await Promise.all(
      events.map(async (event) => {
        let currentTickets = 0;
        let previousTickets = 0;

        const tickets = ctx.db
          .query("tickets")
          .withIndex(
            "by_event_and_purchasedAt",
            (q) =>
              q
                .eq("eventId", event._id)
                .gte(
                  "purchasedAt",
                  previousPeriodStart
                )
          );

        for await (const ticket of tickets) {
          const normalizedStatus =
            ticket.status?.toLowerCase() ?? "active";

          if (
            ticket.ticketSource === "complimentary" ||
            ticket.ticketSource === "manual" ||
            [
              "refunded",
              "revoked",
              "cancelled",
              "canceled",
            ].includes(normalizedStatus)
          ) {
            continue;
          }

          const purchasedAt = ticket.purchasedAt;

          if (!purchasedAt || purchasedAt > now) {
            continue;
          }

          const quantity = Math.max(
            1,
            Math.floor(ticket.quantity ?? 1)
          );

          if (purchasedAt >= currentPeriodStart) {
            currentTickets += quantity;
          } else {
            previousTickets += quantity;
          }
        }

        return {
          currentTickets,
          previousTickets,
        };
      })
    );

    const totals = eventTotals.reduce(
      (result, event) => ({
        currentTickets:
          result.currentTickets +
          event.currentTickets,
        previousTickets:
          result.previousTickets +
          event.previousTickets,
      }),
      {
        currentTickets: 0,
        previousTickets: 0,
      }
    );

    return {
      ...totals,
      changePercent: percentageChange(
        totals.currentTickets,
        totals.previousTickets
      ),
    };
  },
});

export const getOrganizerRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const limit = Math.min(
      20,
      Math.max(1, Math.floor(args.limit ?? 12))
    );

    const events = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.subject)
      )
      .order("desc")
      .take(12);

    const activityGroups = await Promise.all(
      events.map(async (event) => {
        const [tickets, checkIns, compTickets] =
          await Promise.all([
            ctx.db
              .query("tickets")
              .withIndex("by_event", (q) =>
                q.eq("eventId", event._id)
              )
              .order("desc")
              .take(10),
            ctx.db
              .query("checkInActivity")
              .withIndex("by_event_time", (q) =>
                q.eq("eventId", event._id)
              )
              .order("desc")
              .take(8),
            ctx.db
              .query("compTickets")
              .withIndex("by_event", (q) =>
                q.eq("eventId", event._id)
              )
              .order("desc")
              .take(6),
          ]);

        const saleGroups = new Map<
          string,
          {
            id: string;
            buyerLabel: string;
            ticketType: string;
            quantity: number;
            occurredAt: number;
          }
        >();

        for (const ticket of tickets) {
          const normalizedStatus =
            ticket.status?.toLowerCase() ?? "active";

          if (
            ticket.ticketSource === "complimentary" ||
            [
              "refunded",
              "revoked",
              "cancelled",
              "canceled",
            ].includes(normalizedStatus)
          ) {
            continue;
          }

          const groupId =
            ticket.stripeCheckoutSessionId ??
            String(ticket._id);
          const quantity = Math.max(
            1,
            Math.floor(ticket.quantity ?? 1)
          );
          const occurredAt =
            ticket.purchasedAt ??
            ticket.createdAt ??
            ticket._creationTime;
          const existing = saleGroups.get(groupId);

          if (existing) {
            existing.quantity += quantity;
            existing.occurredAt = Math.max(
              existing.occurredAt,
              occurredAt
            );
            continue;
          }

          saleGroups.set(groupId, {
            id: groupId,
            buyerLabel:
              ticket.buyerName?.trim() ||
              ticket.buyerEmail?.trim() ||
              "A guest",
            ticketType:
              ticket.ticketTypeName?.trim() ||
              "Admission",
            quantity,
            occurredAt,
          });
        }

        const sales: OrganizerActivityItem[] = [
          ...saleGroups.values(),
        ].map((sale) => ({
          id: `sale:${sale.id}`,
          kind: "sale",
          title:
            sale.quantity === 1
              ? `${sale.buyerLabel} purchased a ticket`
              : `${sale.buyerLabel} purchased ${sale.quantity} tickets`,
          detail: `${event.name} · ${sale.ticketType}`,
          occurredAt: sale.occurredAt,
          eventId: event._id,
          eventName: event.name,
          href: `/host/events/${event._id}/guest-list`,
        }));

        const entries: OrganizerActivityItem[] =
          checkIns.map((checkIn) => ({
            id: `check-in:${checkIn._id}`,
            kind: "check_in",
            title: `${checkIn.guestName} checked in`,
            detail: [
              event.name,
              checkIn.ticketType ?? "Admission",
              checkIn.gate ?? "Main Gate",
            ].join(" · "),
            occurredAt: checkIn.checkedInAt,
            eventId: event._id,
            eventName: event.name,
            href: "/host/check-in",
          }));

        const complimentary: OrganizerActivityItem[] =
          compTickets.map((compTicket) => {
            const quantity = Math.max(
              1,
              Math.floor(compTicket.quantity)
            );
            const action =
              compTicket.status === "revoked"
                ? "revoked"
                : compTicket.status === "redeemed"
                  ? "redeemed"
                  : "issued";

            return {
              id: `comp:${compTicket._id}:${action}`,
              kind: "comp",
              title: `Comp ticket ${action} for ${compTicket.recipientName}`,
              detail: [
                event.name,
                compTicket.ticketTypeName ?? "Admission",
                quantity === 1
                  ? "1 guest"
                  : `${quantity} guests`,
              ].join(" · "),
              occurredAt:
                compTicket.revokedAt ??
                compTicket.issuedAt,
              eventId: event._id,
              eventName: event.name,
              href: "/host/comp-tickets",
            } satisfies OrganizerActivityItem;
          });

        return [...sales, ...entries, ...complimentary];
      })
    );

    const boosts = await ctx.db
      .query("boostOrders")
      .withIndex("by_organizer", (q) =>
        q.eq("organizerId", identity.subject)
      )
      .order("desc")
      .take(8);

    const boostActivity = await Promise.all(
      boosts.map(async (boost): Promise<OrganizerActivityItem | null> => {
        const event = await ctx.db.get(boost.eventId);

        if (!event) {
          return null;
        }

        const normalizedStatus =
          boost.status?.toLowerCase() ?? "pending";
        const isActive = [
          "active",
          "paid",
          "completed",
        ].includes(normalizedStatus);

        return {
          id: `boost:${boost._id}`,
          kind: "boost",
          title: isActive
            ? `${event.name} was boosted`
            : `Boost ordered for ${event.name}`,
          detail: `${boost.tier} campaign · ${normalizedStatus}`,
          occurredAt:
            boost.createdAt ?? boost._creationTime,
          eventId: event._id,
          eventName: event.name,
          href: "/host/boost",
        };
      })
    );

    return [
      ...activityGroups.flat(),
      ...boostActivity.filter(
        (item): item is OrganizerActivityItem =>
          item !== null
      ),
    ]
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, limit);
  },
});
