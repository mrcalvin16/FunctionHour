# In-person ticket tax review

Function Hour's platform Stripe account charges the buyer. A buyer may live in any state; Operations reviews the tax treatment of each **in-person event venue** instead of inferring tax from the cardholder's address. Do not use this policy for virtual events without a separate sourcing review.

## Before enabling paid sales for an event

1. Confirm the venue's street address, city, state, ZIP, event type, and all paid add-ons. Have a qualified adviser determine applicable state and local admission tax, fee treatment, exemptions, registrations, and who must collect and remit. The organizer's income/reporting obligations are separate from the platform's transaction tax obligations.
2. Create exclusive, active Stripe manual tax rate IDs for admission and, where applicable, the service fee and paid add-ons. An add-on may be merchandise or another distinct tax class. Confirm rates and jurisdictions in Stripe. Stripe manual rates calculate tax; they do not independently register, file, or remit it.
3. In **Admin → Finance → Review event taxes**, enter the event ID, venue ZIP, review outcome, Stripe rate IDs, and a documented basis. An exempt/no-collection outcome needs a reviewed reason. Only the verified Operations account can submit the review. Include any reason a service fee has no tax rate in the review basis.
4. Perform a test-mode Checkout for representative taxable and exempt events; inspect the Stripe final total and tax lines. Reconcile `ticketOrders.taxAmount`, `grossAmount`, `platformFeeAmount`, and `netAmount` against Stripe before approving organizer payouts. Confirm where collected tax is reported and remitted.
5. Repeat the review whenever the venue street address, city, or state changes, and whenever rates, registration, event classification, or local rules change. A venue move invalidates the stored review automatically; a rate change needs an Operations re-review. ZIP changes must be manually re-reviewed because the event form does not currently store a ZIP.

**Rollout gate:** Newly deployed code pauses paid checkout on every live event that does not have a reviewed tax policy. Free tickets without paid add-ons continue to work. Paid add-ons on a collecting event require a separate reviewed add-on rate. Configure current live events before enabling this change in production.

**Accounting:** On a completed checkout, Stripe supplies the actual `amount_tax` and the order records it separately. Organizer proceeds exclude tax and platform fees. A partial refund conservatively withholds the entire refunded amount from proceeds until Operations reconciles its tax and line-item allocation in Stripe; a full refund reduces proceeds to zero. This ledger is not a substitute for filing, remittance, or a tax liability account in Stripe/accounting software.
