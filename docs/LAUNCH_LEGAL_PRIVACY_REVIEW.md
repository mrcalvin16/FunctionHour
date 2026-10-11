# Function Hour launch review: decisions still needed

This file records product behavior and questions for counsel and Operations. It does not decide the platform's regulatory status.

## Buyer terms

- Paid checkout shows the organizer's event refund policy, deadline and contact if supplied, Function Hour's fee treatment, the full total, and links to the site terms before the buyer agrees.
- The server stores the text and version accepted for each checkout reservation and paid order. Older orders may not have this record.
- A full Stripe refund returns the full amount charged. Partial refund decisions must specify the amount to return; Operations should confirm whether an applicable rule or organizer policy requires a different fee treatment.
- Counsel should review the event policy fallback and the treatment of canceled, postponed, rescheduled, and partially refunded events across the states where events are sold.

## Payouts and reporting

- Payments are charged to the Function Hour Stripe account. Eligible organizer proceeds are tracked in the ledger, then manually reviewed before a separate transfer to a verified connected account.
- Counsel and the payments team should confirm the merchant of record, the platform's refund and chargeback obligations, reserves, held-funds and money-transmission analysis, and the terms organizers accept before selling.
- Finance and tax counsel should confirm ticket sales tax collection, marketplace facilitator duties, annual information returns (including any 1099 reporting), and which party bears Stripe processing fees. The sentence “organizers are responsible for their own taxes” cannot settle the platform's own duties.
- Do not promise a fixed payout date until the review, Stripe availability, and connected-account payout timing are documented.

## Privacy inventory

- Optional event-page views call `eventViews.trackEventView` from the browser and store event ID, a browser session ID, traffic source, referrer, path, and the signed-in identifier when available. The browser's saved opt-out and Global Privacy Control turn off future calls from that browser.
- Purchase, ticket, security, and check-in records continue because they are needed to operate the service. An opt-out does not delete earlier views or apply across devices.
- Review all production data flows and vendor agreements for Clerk, Stripe, Convex, Vercel, Mapbox, and email delivery. Confirm whether any tracking, analytics, sharing, retention, or third-party tag requires additional controls, notices, or account-level requests. Validate the “Do Not Sell or Share” label against actual practices and applicable state laws.
- Test Global Privacy Control, saved preference changes, and event-view creation in browser network logs; confirm no optional request is sent after opting out.

## Dependency gate

- CI checks high and critical advisories in production dependencies with `npm audit --omit=dev --audit-level=high`.
- Review the full audit report, including low and development dependency findings, on a regular schedule. Record the advisory, affected path, fix or documented rationale, owner, and review date. Never silently waive a production high or critical finding.

References: [Stripe separate charges and transfers](https://docs.stripe.com/connect/separate-charges-and-transfers), [California AG privacy opt-out guidance](https://oag.ca.gov/news/press-releases/following-data-privacy-day-attorney-general-bonta-reminds-consumers-their-right).
