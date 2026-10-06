/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiOrganizer from "../aiOrganizer.js";
import type * as analytics from "../analytics.js";
import type * as analyticsSources from "../analyticsSources.js";
import type * as audience from "../audience.js";
import type * as budget from "../budget.js";
import type * as checkIn from "../checkIn.js";
import type * as compTickets from "../compTickets.js";
import type * as crons from "../crons.js";
import type * as demoEvents from "../demoEvents.js";
import type * as discountCodes from "../discountCodes.js";
import type * as discoveryFollows from "../discoveryFollows.js";
import type * as eventAccess from "../eventAccess.js";
import type * as eventCreative from "../eventCreative.js";
import type * as eventMessages from "../eventMessages.js";
import type * as eventViews from "../eventViews.js";
import type * as events from "../events.js";
import type * as followedOrganizers from "../followedOrganizers.js";
import type * as merch from "../merch.js";
import type * as organizers from "../organizers.js";
import type * as payouts from "../payouts.js";
import type * as ranking from "../ranking.js";
import type * as savedEvents from "../savedEvents.js";
import type * as supportRateLimits from "../supportRateLimits.js";
import type * as supportRequests from "../supportRequests.js";
import type * as seedMapCoordinates from "../seedMapCoordinates.js";
import type * as ticketAddOns from "../ticketAddOns.js";
import type * as ticketTypes from "../ticketTypes.js";
import type * as tickets from "../tickets.js";
import type * as platformActivity from "../platformActivity.js";
import type * as users from "../users.js";
import type * as waitingList from "../waitingList.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiOrganizer: typeof aiOrganizer;
  analytics: typeof analytics;
  analyticsSources: typeof analyticsSources;
  audience: typeof audience;
  budget: typeof budget;
  checkIn: typeof checkIn;
  compTickets: typeof compTickets;
  crons: typeof crons;
  demoEvents: typeof demoEvents;
  discountCodes: typeof discountCodes;
  discoveryFollows: typeof discoveryFollows;
  eventAccess: typeof eventAccess;
  eventCreative: typeof eventCreative;
  eventMessages: typeof eventMessages;
  eventViews: typeof eventViews;
  events: typeof events;
  followedOrganizers: typeof followedOrganizers;
  merch: typeof merch;
  organizers: typeof organizers;
  payouts: typeof payouts;
  ranking: typeof ranking;
  savedEvents: typeof savedEvents;
  supportRateLimits: typeof supportRateLimits;
  supportRequests: typeof supportRequests;
  seedMapCoordinates: typeof seedMapCoordinates;
  ticketAddOns: typeof ticketAddOns;
  ticketTypes: typeof ticketTypes;
  tickets: typeof tickets;
  platformActivity: typeof platformActivity;
  users: typeof users;
  waitingList: typeof waitingList;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
};
