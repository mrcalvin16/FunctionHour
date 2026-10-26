# FunctionHour monetization proposal — merch and dynamic boosts

Status: **draft for review, not live checkout pricing**.

## Merchandise
- Platform commission: **5% of merchandise subtotal**, excluding tax and shipping.
- Free to list; fee collected only on successful sales.
- Stripe payment processing, refunds, chargebacks, shipping, and tax treatment must be explicitly reconciled before production. Do not silently charge an additional buyer fee.
- Display commission and estimated organizer net before organizer publishes a product.

## Dynamic event boosts
Boosts are **flexibly priced** based on geographic demand, local competition, available ad placement inventory, event timing, duration and placement type—not a fixed nationwide rate.
- Indicative starting price **$5**; quote bounded at **$500 per purchase**.
- Placement tiers: Discovery, Featured, Spotlight. These are placement types, **not fixed-price packages**.
- Formula implemented in `lib/monetizationPricing.ts`: per-day placement baseline × local demand factor × competition factor × event urgency factor × duration discount; capped and rounded in cents.
- The app must compute **measured** demand and competition server-side from eligible geography and placement inventory. Never let the client submit its own demand score or competitor count as authoritative.
- Display **actual quoted total, duration, placement, targeted area and expiration** before payment; never change the approved amount afterward.
- Persist server-generated quote with expiration (15 minutes), signed/authenticated ownership, eligible event, currency, inventory reservation, and Stripe idempotency key; recalculate when expired.
- Do not guarantee sales, impressions, rank or outcomes unless separately supported by inventory and measurement.
- Do not infer demand from sensitive demographic attributes, protected traits, or individual buyer characteristics.
- Record quote inputs, formula version, paid amount, and delivery metrics for auditability.

## Production gates
1. Validate organizer permissions and event ownership.
2. Confirm inventory and market signals are reliable; use transparent conservative baseline when insufficient.
3. Wire merchandise commission to actual Stripe checkout/payment splits and refund paths.
4. Wire boost quotes to payment intents, placement inventory, fulfillment, cancellation and refund handling.
5. Add tests for rounding, price caps, expired quotes, duplicate payment events, refunds, market data gaps and authorization.
6. QA in staging, then business approval before rollout.

**Existing ticketing fees remain unchanged.**
