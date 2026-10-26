# Dynamic boost checkout release checklist

This feature replaces the legacy fixed-price boost purchase UI with organizer-approved, server-generated quotes.

## Deployment order
1. Review and merge this PR after CI/build validation.
2. Deploy Convex functions and schema to the **same deployment used by production Vercel**:
   `npx convex deploy` (using the production deployment credentials).
3. Deploy the matching Next.js build to Vercel.
4. Verify `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SHARED_SECRET`,
   `NEXT_PUBLIC_CONVEX_URL`, and HTTPS `NEXT_PUBLIC_APP_URL` are correct for the environment.
5. Add `BOOST_PAYMENTS_ENABLED=true` to **both** Convex and Vercel environment variables **only after** staging payment and webhook tests pass.
   Keep unset/false in production until release approval.

## Test cases
- Organizer cannot quote another event; marketing access is required.
- City/state required; cancelled/past events blocked.
- Price increases with competition and measured demand; low-data fallback is disclosed.
- Organizer approves exact server-generated quote; browser cannot supply price.
- Expired quote rejected; quote cannot be used by another Clerk account.
- Stripe Checkout session idempotency and duplicate webhook delivery do not duplicate orders.
- Only Stripe-signed, paid Checkout sessions activate promotions.
- Wrong amount, wrong currency, or wrong session ID must not activate a boost.
- Full refund reconciles order and deactivates applicable boost; partial refund handling requires policy review.
- Existing ticket and merchandise checkouts and webhooks still pass regression tests.
- Confirm no payment is accepted when `BOOST_PAYMENTS_ENABLED` is disabled.

## Known limitations before production launch
- Local market signals use bounded samples of recent event views/clicks; review sample representativeness.
- Placement inventory uses provisional slots, not transactional inventory reservations.
- Stripe Checkout may remain open longer than the initial 15-minute quote; accepted price is locked when checkout begins.
- Existing legacy boost sessions still use the old webhook fulfillment path.
- Production rollout must verify refund/dispute workflows, financial reporting, and actual placement behavior.
