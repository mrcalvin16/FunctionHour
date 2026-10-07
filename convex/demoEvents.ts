import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const DEMO_ORGANIZERS = [
  { id: "demo-orbit-social", name: "Orbit Social Club", bio: "Thoughtfully hosted gatherings for curious people and good conversation.", avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&h=320&fit=crop&crop=faces", bannerUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&h=650&fit=crop" },
  { id: "demo-afterglow-collective", name: "Afterglow Collective", bio: "Music-forward nights, creative community, and a little room to dance.", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&h=320&fit=crop&crop=faces", bannerUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&h=650&fit=crop" },
  { id: "demo-tablefolk", name: "Tablefolk Gatherings", bio: "Neighborhood food experiences built around sharing a table.", avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=320&h=320&fit=crop&crop=faces", bannerUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&h=650&fit=crop" },
  { id: "demo-common-ground", name: "Common Ground Studio", bio: "Low-pressure ways to move, make, meet, and feel at home in your city.", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=320&h=320&fit=crop&crop=faces", bannerUrl: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1600&h=650&fit=crop" },
  { id: "demo-signal-house", name: "Signal House Sessions", bio: "Independent voices and thoughtful rooms for people building what comes next.", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=320&h=320&fit=crop&crop=faces", bannerUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&h=650&fit=crop" },
  { id: "demo-weekend-fieldnotes", name: "Weekend Fieldnotes", bio: "Outdoor and family-friendly city adventures, made easy to join.", avatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=320&h=320&fit=crop&crop=faces", bannerUrl: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600&h=650&fit=crop" },
];

const cityCoordinates: Record<string, [number, number]> = {
  "New York": [-73.9857, 40.7484], Houston: [-95.3698, 29.7604], Atlanta: [-84.388, 33.749], Dallas: [-96.797, 32.7767],
  "Silicon Valley": [-122.0322, 37.3688], Boston: [-71.0589, 42.3601], "Los Angeles": [-118.2437, 34.0522], Chicago: [-87.6298, 41.8781], Miami: [-80.1918, 25.7617],
};

function at(daysFromNow: number, hour: number, minute = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

function dateLabel(timestamp: number) {
  return new Date(timestamp).toISOString();
}

const EVENTS = [
  { key: "nyc-central-park-new-friends", name: "New Year, New Friends — Central Park", description: "Start the year outside with an easygoing, family-style meetup in Central Park. Bring a frisbee or disc, a blanket, snacks to share if you like, and come ready to meet a few new faces. There’s no program and no pressure—just fresh air, a little play, and good company. All ages welcome with a grown-up.", category: "Community", city: "New York", state: "NY", venue: "Sheep Meadow, Central Park", address: "Sheep Meadow, Central Park, New York, NY", days: 90, hour: 11, minute: 0, price: 0, capacity: 120, organizer: 0, image: "photo-1511632765486-a01980e01a18", tags: ["family-friendly", "outdoors", "social"], short: "Bring a disc, meet new people, and ease into the year together in Central Park." },
  { key: "nyc-after-hours-jazz", name: "After Hours: Blue Note Listening Room", description: "A candlelit late set for people who love the space between the notes. A rotating quartet blends modern jazz, soul, and improvisation in an intimate downtown room. Doors open at 8:30; the first set begins at 9. A small bar menu is available throughout the evening.", category: "Music", city: "New York", state: "NY", venue: "The Juniper Room", address: "Lower East Side, New York, NY", days: 18, hour: 21, minute: 0, price: 28, capacity: 90, organizer: 1, image: "photo-1516280440614-37939bbacd81", tags: ["live music", "jazz", "nightlife"], short: "A close-up late-night set of modern jazz, soul, and improvisation." },
  { key: "nyc-supper-club", name: "The Sunday Supper Club: Winter Table", description: "A communal dinner built around a seasonal, four-course menu and the joy of lingering. Meet the chefs, learn where the ingredients came from, and settle in with neighbors and new friends. Dietary notes can be shared with the host after booking; vegetarian plates are available.", category: "Food & Drink", city: "New York", state: "NY", venue: "Morrow House", address: "Brooklyn, New York, NY", days: 27, hour: 18, minute: 30, price: 64, capacity: 42, organizer: 2, image: "photo-1414235077428-338989a2e8c0", tags: ["dinner", "community", "food"], short: "A seasonal four-course dinner with a seat saved for someone new." },
  { key: "houston-bayou-run-club", name: "Bayou Sunrise Run & Coffee", description: "An all-pace morning run along Buffalo Bayou, followed by coffee and breakfast tacos with the crew. Choose a relaxed 2-mile or 4-mile loop, meet at the trail entrance, and stick around to catch up. First-timers and walkers are very welcome.", category: "Wellness", city: "Houston", state: "TX", venue: "Buffalo Bayou Park Cistern Plaza", address: "105 Sabine St, Houston, TX", days: 12, hour: 7, minute: 30, price: 0, capacity: 80, organizer: 3, image: "photo-1502904550040-7534597429ae", tags: ["running", "outdoors", "coffee"], short: "A social sunrise run, with an easy pace and coffee waiting at the finish." },
  { key: "houston-live-room", name: "The Live Room: Gulf Coast Sound", description: "Three rising Gulf Coast artists share one intimate stage for a night of guitar-led soul, indie R&B, and big harmonies. General admission gets you in the room; VIP includes early entry and a short post-show acoustic session with the artists.", category: "Music", city: "Houston", state: "TX", venue: "Morrow Sound Hall", address: "EaDo, Houston, TX", days: 24, hour: 20, minute: 0, price: 24, capacity: 180, organizer: 1, image: "photo-1501386761578-eac5c94b800a", tags: ["live music", "independent artists", "VIP"], short: "A triple bill of soulful, independent Gulf Coast sounds." },
  { key: "houston-night-market", name: "Lantern Night Market", description: "A warm evening stroll through local food stalls, small-batch makers, and live acoustic sets. Entry is free; food, drinks, and maker purchases are optional and paid directly to vendors. Children are welcome until 8 p.m.; dogs on leash are welcome outdoors.", category: "Food & Drink", city: "Houston", state: "TX", venue: "Juniper Yard", address: "Houston Heights, Houston, TX", days: 35, hour: 17, minute: 0, price: 0, capacity: 350, organizer: 2, image: "photo-1514933651103-005eec06c04b", tags: ["market", "food", "family-friendly"], short: "Free entry to local bites, handmade finds, and acoustic music under the lanterns." },
  { key: "atlanta-supper-club", name: "Sunday Supper: Atlanta in Season", description: "A relaxed long-table dinner celebrating Georgia farms and the cooks who know how to make the most of winter produce. The evening includes a welcome drink, four shared courses, and a brief story from the maker behind each plate. Come solo or bring someone along.", category: "Food & Drink", city: "Atlanta", state: "GA", venue: "The Lark Table", address: "Old Fourth Ward, Atlanta, GA", days: 16, hour: 18, minute: 0, price: 58, capacity: 48, organizer: 2, image: "photo-1559339352-11d035aa65de", tags: ["dinner", "local food", "community"], short: "A Georgia-grown supper with four shared courses and stories from the makers." },
  { key: "atlanta-startup-social", name: "Build in the South: Founder Social", description: "An unhurried networking night for founders, operators, designers, and people curious about what’s being built across the South. Expect short introductions, one useful conversation prompt, and plenty of time to meet people naturally. No pitches from a stage; just a good room and a clear name tag.", category: "Networking", city: "Atlanta", state: "GA", venue: "Switchyard Studio", address: "West Midtown, Atlanta, GA", days: 29, hour: 18, minute: 30, price: 18, capacity: 110, organizer: 4, image: "photo-1517248135467-4c7edcad34c4", tags: ["startup", "networking", "founders"], short: "A no-stage, high-signal social for Atlanta’s builders and operators." },
  { key: "atlanta-family-art", name: "Little Makers: Color, Clay & Collage", description: "A joyful Saturday studio session where kids and their grown-ups can explore clay, collage, and big washable color. Local teaching artists guide a few easy prompts, but there’s no wrong way to make. The demo listing is free entry; the real studio activity would require materials and host coordination. Come ready to get a little messy.", category: "Arts & Culture", city: "Atlanta", state: "GA", venue: "Pinecone Art Studio", address: "Decatur, Atlanta, GA", days: 40, hour: 10, minute: 0, price: 0, capacity: 32, organizer: 3, image: "photo-1472162072942-cd5147eb3902", tags: ["family-friendly", "arts", "kids"], short: "A hands-on art morning for kids and their favorite grown-ups." },
  { key: "dallas-courtside", name: "Courtside Social: Hoops Watch Party", description: "Big screens, local food pop-ups, and a room full of fans for a relaxed basketball watch night. Your ticket includes reserved entry and a welcome snack; seats are first come, first served. Wear your colors, bring your crew, and keep the friendly rivalries friendly.", category: "Sports", city: "Dallas", state: "TX", venue: "The Foundry Social", address: "Deep Ellum, Dallas, TX", days: 14, hour: 18, minute: 30, price: 12, capacity: 220, organizer: 0, image: "photo-1461896836934-ffe607ba8211", tags: ["watch party", "basketball", "social"], short: "A big-screen hoops night with local bites and friendly fan energy." },
  { key: "dallas-creative-morning", name: "Creative Reset: Sketch & Slow Coffee", description: "Put the scroll away for a couple of hours and make something with your hands. This guided sketching session pairs simple drawing prompts with excellent coffee and a quiet, friendly studio. All materials are supplied, and absolutely no art experience is needed.", category: "Arts & Culture", city: "Dallas", state: "TX", venue: "Soft Corner Studio", address: "Bishop Arts District, Dallas, TX", days: 31, hour: 10, minute: 30, price: 22, capacity: 28, organizer: 3, image: "photo-1513364776144-60967b0f800f", tags: ["creative", "art", "coffee"], short: "A guided sketch session and slow coffee for a fresh creative reset." },
  { key: "silicon-valley-demo-night", name: "Small Bets Demo Night", description: "A friendly, carefully curated evening where early-stage builders share a five-minute demo and what they learned making it. Come to show, ask thoughtful questions, find a collaborator, or simply see what’s taking shape. General admission includes the program; a limited VIP tier adds a small-group founder dinner afterward.", category: "Technology", city: "Silicon Valley", state: "CA", venue: "The Relay House", address: "Downtown San Jose, CA", days: 21, hour: 18, minute: 0, price: 20, capacity: 130, organizer: 4, image: "photo-1519389950473-47ba0277781c", tags: ["technology", "startup", "demo night", "VIP"], short: "Five-minute demos and honest lessons from Silicon Valley builders." },
  { key: "silicon-valley-trail", name: "Foothill Reset: Guided Sunset Walk", description: "Trade screens for golden-hour trail views on a gentle, guided loop through the foothills. The pace is conversational, the group stays together, and there’s time to pause for photos along the way. Bring water, comfortable shoes, and a light layer for the descent.", category: "Outdoor", city: "Silicon Valley", state: "CA", venue: "Alum Rock Trailhead", address: "Alum Rock Park, San Jose, CA", days: 33, hour: 16, minute: 0, price: 0, capacity: 24, organizer: 5, image: "photo-1470770841072-f978cf4d019e", tags: ["outdoors", "hiking", "wellness"], short: "A gentle sunset trail walk with room to breathe and meet your neighbors." },
  { key: "boston-listening-room", name: "The Listening Room: Winter Sessions", description: "An intimate, seated night for discovering a local songwriter before the room gets too big. The evening features two short sets, a listening break, and a small conversation with the artists. Doors at 7:30; performances begin at 8. Limited standing room is available at the back.", category: "Music", city: "Boston", state: "MA", venue: "North Window Room", address: "Cambridge, MA", days: 26, hour: 20, minute: 0, price: 26, capacity: 76, organizer: 1, image: "photo-1516280440614-37939bbacd81", tags: ["songwriter", "live music", "listening room"], short: "Two intimate sets from local songwriters in a candlelit listening room." },
  { key: "boston-snowday-social", name: "Snowday Social: Cocoa & Board Games", description: "A cozy, all-ages afternoon for board games, hot cocoa, and new neighborhood friends. We’ll have tables for quick games, longer strategy favorites, and a kids’ corner with easy picks. Bring a favorite game if you want, or just show up—there’ll be plenty to share.", category: "Community", city: "Boston", state: "MA", venue: "The Common Room", address: "Somerville, MA", days: 44, hour: 14, minute: 0, price: 0, capacity: 90, organizer: 0, image: "photo-1511632765486-a01980e01a18", tags: ["community", "family-friendly", "games"], short: "Hot cocoa, board games, and an easy winter hang for every age." },
  { key: "la-rooftop-sunset", name: "Golden Hour on the Roof", description: "A sunset rooftop session with a live DJ, a small natural-wine list, and generous views across the city. Come early for the light, stay for the dance floor, and take a breather in the quieter lounge when you need one. General admission and early-entry VIP are available.", category: "Nightlife", city: "Los Angeles", state: "CA", venue: "Sundown House", address: "Arts District, Los Angeles, CA", days: 19, hour: 17, minute: 30, price: 32, capacity: 160, organizer: 1, image: "photo-1514525253161-7a46d19cd819", tags: ["nightlife", "DJ", "rooftop", "VIP"], short: "A rooftop sunset, a live DJ, and a dance floor that warms up after dark." },
  { key: "la-family-cookout", name: "Sunday in the Park: Picnic & Play", description: "A welcoming park day for neighbors and visiting families, with a picnic blanket zone, lawn games, and a short nature scavenger hunt for kids. Bring your own lunch and something to sit on; we’ll bring the games, fruit, and a few extra frisbees. Come for twenty minutes or the whole afternoon.", category: "Community", city: "Los Angeles", state: "CA", venue: "Silver Lake Meadow", address: "Silver Lake, Los Angeles, CA", days: 38, hour: 11, minute: 0, price: 0, capacity: 100, organizer: 5, image: "photo-1500530855697-b586d89ba3ee", tags: ["family-friendly", "outdoors", "picnic"], short: "A low-key park picnic with lawn games and a scavenger hunt for kids." },
  { key: "chicago-soul-train", name: "Soul on the Floor: Chicago Dance Social", description: "A welcoming dance night with a live soul band, a short beginner-friendly lesson, and an open floor that belongs to everybody. Come dressed to move or just to listen from the edge of the room. VIP includes priority entry and a reserved lounge table for your group.", category: "Music", city: "Chicago", state: "IL", venue: "Lake & Loom Hall", address: "West Loop, Chicago, IL", days: 23, hour: 19, minute: 30, price: 30, capacity: 200, organizer: 1, image: "photo-1492684223066-81342ee5ff30", tags: ["live music", "dance", "soul", "VIP"], short: "Live soul, a quick beginner lesson, and an open floor for everyone." },
  { key: "chicago-lakefront-yoga", name: "Lakefront Stretch & Sound Bath", description: "Start the weekend with gentle movement and a restorative sound bath in a bright studio near the water. All levels are welcome, and the session is designed to leave room for beginners and people returning to practice. Bring a mat if you have one; a small number are available to borrow.", category: "Wellness", city: "Chicago", state: "IL", venue: "Stillwater Movement Room", address: "Lakeview, Chicago, IL", days: 30, hour: 9, minute: 0, price: 25, capacity: 34, organizer: 3, image: "photo-1545205597-3d9d02c29597", tags: ["wellness", "yoga", "sound bath"], short: "Gentle movement and a restorative sound bath to reset your weekend." },
  { key: "miami-art-walk", name: "Color Current: Neighborhood Art Walk", description: "An easygoing guided walk through murals, independent galleries, and artist-run spaces, with stops for short stories from the people making the work. The route is mostly flat and about one mile. Meet at the painted courtyard; the group wraps with a casual cafecito stop nearby.", category: "Arts & Culture", city: "Miami", state: "FL", venue: "Current House Courtyard", address: "Wynwood, Miami, FL", days: 28, hour: 16, minute: 30, price: 14, capacity: 45, organizer: 4, image: "photo-1531058020387-3be344556be6", tags: ["art", "walking tour", "local culture"], short: "A one-mile mural and gallery walk led by people who make the neighborhood." },
].map((event) => ({ ...event, imageUrl: `https://images.unsplash.com/${event.image}?auto=format&fit=crop&w=1600&q=85` }));

async function requireAdmin(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  const byToken = await ctx.db.query("users").withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).first();
  const byClerk = byToken ? null : await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject)).first();
  const byUser = byToken || byClerk ? null : await ctx.db.query("users").withIndex("by_userId", (q) => q.eq("userId", identity.subject)).first();
  const user = byToken ?? byClerk ?? byUser;
  const email = (typeof identity.email === "string" ? identity.email : user?.email ?? "").trim().toLowerCase();
  if (user?.role !== "admin" && email !== "operations@functionhour.com") {
    throw new Error("Only Function Hour Operations admins can manage demo events.");
  }
}

async function requireMutationAdmin(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  const byToken = await ctx.db.query("users").withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).first();
  const byClerk = byToken ? null : await ctx.db.query("users").withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject)).first();
  const byUser = byToken || byClerk ? null : await ctx.db.query("users").withIndex("by_userId", (q) => q.eq("userId", identity.subject)).first();
  const user = byToken ?? byClerk ?? byUser;
  const email = (typeof identity.email === "string" ? identity.email : user?.email ?? "").trim().toLowerCase();
  if (user?.role !== "admin" && email !== "operations@functionhour.com") throw new Error("Only Function Hour Operations admins can manage demo events.");
}

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    await requireMutationAdmin(ctx);
    return await seedDemoInventory(ctx);
  },
});

async function seedDemoInventory(ctx: MutationCtx) {
  const now = Date.now();
  for (const organizer of DEMO_ORGANIZERS) {
      const userId = organizer.id;
      const found = await ctx.db.query("users").withIndex("by_userId", (q) => q.eq("userId", userId)).first();
      const profile = { userId, clerkId: userId, tokenIdentifier: `demo:${userId}`, email: `${userId}@functionhour.example`, name: organizer.name, organizerName: organizer.name, bio: organizer.bio, avatarUrl: organizer.avatarUrl, bannerUrl: organizer.bannerUrl, role: "organizer", isOrganizer: true, onboardingComplete: true, createdAt: now, updatedAt: now };
      if (found) await ctx.db.patch(found._id, profile);
      else await ctx.db.insert("users", profile);
  }

  const allExisting = await ctx.db.query("events").collect();
  const existingByKey = new Map(allExisting.filter((event) => event.isDemo && event.demoKey).map((event) => [event.demoKey!, event]));
  const seededIds = [];
  for (const [index, item] of EVENTS.entries()) {
      const timestamp = item.key === "nyc-central-park-new-friends"
        ? new Date(`${new Date().getFullYear() + 1}-01-01T11:00:00-05:00`).getTime()
        : at(item.days, item.hour, item.minute);
      const [longitude, latitude] = cityCoordinates[item.city];
      const organizer = DEMO_ORGANIZERS[item.organizer];
      const eventData = { name: item.name, description: item.description, shortDescription: item.short, tags: item.tags, category: item.category, location: `${item.city}, ${item.state}`, venueName: item.venue, venueAddress: item.address, city: item.city, state: item.state, latitude: latitude + ((index % 3) - 1) * 0.009, longitude: longitude + ((index % 4) - 1.5) * 0.011, dateString: dateLabel(timestamp), eventDate: timestamp, price: item.price, totalTickets: item.capacity, ticketsSold: 0, imageUrl: item.imageUrl, userId: organizer.id, organizerId: organizer.id, createdAt: now, isDemo: true, demoKey: item.key, demoHidden: false, featuredWeight: 10, refundPolicy: "This sample listing is for demonstration only. No real event or ticket purchase is associated with this listing.", ageRequirement: item.tags.includes("family-friendly") ? "All ages with adult supervision" : "18+ unless otherwise noted", entryNotes: item.short };
      const existing = existingByKey.get(item.key);
      const eventId = existing ? existing._id : await ctx.db.insert("events", eventData);
      if (existing) await ctx.db.patch(existing._id, eventData);
      seededIds.push(eventId);
      const oldTypes = await ctx.db.query("ticketTypes").withIndex("by_event", (q) => q.eq("eventId", eventId)).collect();
      for (const ticketType of oldTypes) await ctx.db.delete(ticketType._id);
      const ticketTypes = item.price === 0
        ? [{ name: "Community Admission", price: 0, description: "Free sample event entry", perks: ["Sample event listing"] }]
        : [
            { name: "General Admission", price: item.price, description: "Standard entry to the sample event.", perks: ["Event entry"] },
            ...(index % 4 === 1 ? [{ name: "VIP", price: item.price + 35, description: "Enhanced sample event experience.", perks: ["Priority entry", "VIP area or bonus experience"] }] : []),
          ];
      for (const [ticketIndex, type] of ticketTypes.entries()) {
        await ctx.db.insert("ticketTypes", { eventId, ...type, quantity: ticketIndex === 0 ? item.capacity : Math.max(10, Math.floor(item.capacity * 0.15)), sold: 0, isActive: true, createdAt: now });
      }
  }
  return { count: seededIds.length, eventIds: seededIds, cities: EVENTS.reduce<Record<string, number>>((counts, event) => ({ ...counts, [event.city]: (counts[event.city] ?? 0) + 1 }), {}) };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return (await ctx.db.query("events").collect()).filter((event) => event.isDemo === true).map(({ _id, name, city, state, category, eventDate, demoHidden }) => ({ _id, name, city, state, category, eventDate, demoHidden }));
  },
});

export const setHidden = mutation({
  args: { hidden: v.boolean() },
  handler: async (ctx, args) => {
    await requireMutationAdmin(ctx);
    const events = (await ctx.db.query("events").collect()).filter((event) => event.isDemo === true);
    for (const event of events) await ctx.db.patch(event._id, { demoHidden: args.hidden });
    return { count: events.length, hidden: args.hidden };
  },
});

export const remove = mutation({
  args: {},
  handler: async (ctx) => {
    await requireMutationAdmin(ctx);
    const events = (await ctx.db.query("events").collect()).filter((event) => event.isDemo === true);
    for (const event of events) {
      const [tickets, orders, reservations, types, merchOrders, boosts, merch, savedEvents, views] = await Promise.all([
        ctx.db.query("tickets").withIndex("by_event", (q) => q.eq("eventId", event._id)).take(1),
        ctx.db.query("ticketOrders").withIndex("by_event_and_paidAt", (q) => q.eq("eventId", event._id)).take(1),
        ctx.db.query("ticketCheckoutReservations").withIndex("by_event", (q) => q.eq("eventId", event._id)).collect(),
        ctx.db.query("ticketTypes").withIndex("by_event", (q) => q.eq("eventId", event._id)).collect(),
        ctx.db.query("merchOrders").withIndex("by_eventId", (q) => q.eq("eventId", event._id)).take(1),
        ctx.db.query("boostOrders").withIndex("by_event", (q) => q.eq("eventId", event._id)).take(1),
        ctx.db.query("merch").withIndex("by_eventId", (q) => q.eq("eventId", event._id)).take(1),
        ctx.db.query("savedEvents").withIndex("by_event", (q) => q.eq("eventId", event._id)).take(1),
        ctx.db.query("eventViews").withIndex("by_event", (q) => q.eq("eventId", event._id)).take(1),
      ]);
      if (tickets.length || orders.length || reservations.length || merchOrders.length || boosts.length || merch.length || savedEvents.length || views.length) {
        throw new Error(`Cannot remove demo event ${event.name}: related history exists. Hide the demo inventory instead.`);
      }
      for (const type of types) await ctx.db.delete(type._id);
      await ctx.db.delete(event._id);
    }
    return { count: events.length };
  },
});

export const count = internalQuery({
  args: {},
  handler: async (ctx) => {
    const events = (await ctx.db.query("events").collect()).filter((event) => event.isDemo === true);
    return { count: events.length, activeCount: events.filter((event) => event.demoHidden !== true).length, cities: events.reduce<Record<string, number>>((counts, event) => ({ ...counts, [event.city ?? "Unknown"]: (counts[event.city ?? "Unknown"] ?? 0) + 1 }), {}) };
  },
});


/** CLI-only: enrich existing sample listings without resetting events or inventory. */
export const seedExtras = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const knownKeys = new Set(EVENTS.map((event) => event.key));
    let eventCount = 0;
    let merchCreated = 0;
    let addOnsCreated = 0;
    for (const organizer of DEMO_ORGANIZERS) {
      const events = await ctx.db.query("events")
        .withIndex("by_userId", (q) => q.eq("userId", organizer.id)).take(100);
      for (const event of events) {
        if (!event.isDemo || !event.demoKey || !knownKeys.has(event.demoKey)) continue;
        eventCount++;
        const products = await ctx.db.query("merch")
          .withIndex("by_eventId", (q) => q.eq("eventId", event._id)).take(100);
        const samples = [
          { key: "tee", name: "Event Tee", price: 28, inventory: 80, sizes: ["S", "M", "L", "XL", "2XL"], image: "photo-1521572163474-6864f9cf17ab", featured: true },
          { key: "tote", name: "Souvenir Tote", price: 18, inventory: 60, sizes: [], image: "photo-1590874103328-eac38a683ce7", featured: false },
          { key: "hoodie", name: "Limited Edition Hoodie", price: 55, inventory: 25, sizes: ["S", "M", "L", "XL"], image: "photo-1556821840-3a63f95609a7", featured: false },
        ];
        for (const sample of samples) {
          const sku = `demo:${event.demoKey}:${sample.key}`;
          if (products.some((product) => product.sku === sku)) continue;
          await ctx.db.insert("merch", {
            eventId: event._id, organizerId: organizer.id,
            name: `${event.name} — ${sample.name}`,
            description: `Demo merchandise for ${event.name}. Sample image for illustration; event pickup only. Not available for real purchase.`,
            sku, productType: sample.key, currency: "usd", status: "published",
            fulfillmentMethod: "pickup", pickupAtEvent: true,
            price: sample.price, inventory: sample.inventory, reserved: 0, sold: 0,
            sizes: sample.sizes, featured: sample.featured,
            limitedDrop: sample.key === "hoodie", isActive: true, isPreorder: false,
            imageUrl: `https://images.unsplash.com/${sample.image}?auto=format&fit=crop&w=800&q=80`,
            createdAt: now, updatedAt: now,
          });
          merchCreated++;
        }
        const extras = await ctx.db.query("ticketAddOns")
          .withIndex("by_event", (q) => q.eq("eventId", event._id)).take(100);
        for (const extra of [
          { name: "Demo VIP Upgrade", price: 35, quantity: 30, description: "Sample priority entry and reserved viewing area. Admission ticket required; this optional upgrade does not include entry." },
          { name: "Demo Lounge Access", price: 20, quantity: 40, description: "Sample access to a relaxed lounge space during the event. Admission ticket required." },
          { name: "Demo Souvenir Bundle", price: 12, quantity: 75, description: "Sample keepsake wristband and event postcard, collected at the venue. Admission ticket required." },
        ]) {
          if (extras.some((existing) => existing.name === extra.name)) continue;
          await ctx.db.insert("ticketAddOns", {
            eventId: event._id, ...extra, isRequired: false,
            isActive: true, isSoldOut: false, createdAt: now,
          });
          addOnsCreated++;
        }
      }
    }
    if (eventCount < 10) throw new Error("At least 10 known demo events must exist before adding sample extras. No changes were saved.");
    return { eventCount, merchCreated, addOnsCreated };
  },
});
