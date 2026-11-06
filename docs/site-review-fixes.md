# Site review corrections

## Schedule consistency and rendering

The public city page rendered event instants in the server timezone, while browser-rendered details used the visitor timezone. The same schedule therefore appeared as December 27 at 2 AM and December 26 at 8 PM. Discovery date badges also used machine-local month/day formatting, triggering a React hydration mismatch.

Zone-free dateString values now preserve the host-entered wall-clock fields, including calendar-only dates. Schedule labels identify event-local time. Records with only an absolute timestamp are displayed consistently with an explicit UTC label. End instants without an end wall-clock value retain their recorded duration. Discovery badges and Passport date parts use the same display fields in UTC. This does not modify stored event timestamps or invent a venue timezone.

Saved Events uses the shared schedule, venue, and listing-status/price helpers instead of raw dateString and price interpolation.

## Passport totals

City identities now trim leading/trailing whitespace, collapse internal whitespace, normalize Unicode compatibility forms, and compare case-insensitively. Categories use the same Experience fallback as the visible stamp labels. City and category data are not rewritten.

## Map compatibility

The Mapbox token is configured for production. The former feature check rejected contexts reporting a major performance caveat, which can exclude software-rendered browsers. The check now permits those WebGL2 contexts and rejects unsupported WebGL1-only browsers, consistent with Mapbox GL JS v3's WebGL2 requirement. The event-list fallback remains available when a usable context cannot be created. Actual map rendering must be verified on the deployed build; software graphics support is browser/environment-dependent.

## Validation

Six regression checks cover calendar-only dates, missing dates, venue formatting, overnight host-local schedules across UTC/Chicago/Los Angeles/Tokyo, legacy end durations, timestamp-only UTC labeling, and normalized city identities. TypeScript and targeted lint pass (existing image optimization warnings remain). CI runs these regressions alongside its production build and existing security checks. Live post-deployment checks should confirm schedule equality across city/details/saved pages, normalized Passport totals, no fresh React hydration errors on the Events page, and map behavior.
