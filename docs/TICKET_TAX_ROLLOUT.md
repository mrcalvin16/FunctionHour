# In-person ticket tax collection

Function Hour charges buyers on its platform Stripe account. An attendee may live in any state; admission to an in-person event is generally sourced to the venue, while virtual events and separately sold goods can have different sourcing and treatment. Configure only supported in-person events through this flow.

## Two collection paths

- **Function Hour collection:** Operations uses Admin → Finance → Function Hour tax settings when Function Hour must collect in a venue jurisdiction. The platform policy overrides organizer settings. Configure an active exclusive Stripe rate for admission and separate rates for service fees and add-ons when applicable. Record the venue ZIP and basis. Function Hour must maintain its own jurisdiction determination, registrations, filings, and remittances outside this application.
- **Organizer collection:** Where Function Hour does not collect, an event owner may configure an admission rate in Host → Tickets → Organizer tax settings, attest to applicable registration and remittance, and choose whether the same rate applies to add-ons. Collected organizer tax is included in organizer proceeds and must be remitted by the organizer. The Function Hour fee is not taxed by this organizer rate. No organizer tax is added when an organizer does not configure one. This is not a determination that no tax is due.

Buyer checkout never waits for a per-event Operations approval when no tax policy exists. If a configured venue moves, checkout pauses until the event's tax settings are updated. Stripe manual tax rates calculate the tax on selected Checkout lines; they do not register, file, or remit taxes. Checkout displays Stripe's final tax and amount before payment. The order ledger stores tax amount, collector, and venue jurisdiction separately.

## Launch operations

1. Determine Function Hour's marketplace-facilitator and seller obligations per jurisdiction, including local admission taxes, fee treatment, exemptions, registration thresholds, and filing deadlines. Eventbrite's tax footprint is its own and cannot be copied as Function Hour's legal footprint.
2. Configure Function Hour collection in applicable jurisdictions before selling there. Review every live venue and add-on class for those jurisdictions; this version uses event policies and does not automatically discover newly applicable jurisdictions.
3. Confirm the organizer's own registration and tax rate where they choose to collect. Reconcile tax and refunds by collector before approving payouts. Stripe balance alone is not a tax liability ledger.
4. Test representative venues, mixed add-ons, venue changes, full and partial refunds, and both collection paths. Virtual events require their own treatment before launch.
