# FunctionHour accessibility work

## Target and limits

FunctionHour uses **WCAG 2.2 Level AA** as an engineering target for its web experience. This is an ongoing target, not a certification that every page or third-party workflow currently conforms.

The Department of Justice's ADA guidance explains that businesses open to the public should make their web services accessible, and specifically calls out keyboard access as a common barrier. The ADA's legal application depends on the facts and jurisdiction; this engineering target does not eliminate litigation risk or replace advice from qualified accessibility counsel.

References:

- DOJ, [Guidance on Web Accessibility and the ADA](https://www.ada.gov/resources/web-guidance/)
- W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)

## Improvements in the accessibility foundation change

- A global, high-contrast keyboard focus indicator, including controls that otherwise reset outlines.
- A direct text label for the shared event search field.
- Event-specific accessible names and pressed state for save controls.
- Pressed states and group labels for map category/date filters, plus map loading/result announcements and an accessible map region name.
- Labels and autocomplete hints for checkout name/email fields.
- Announced selected state for ticket/add-on options; clearer quantity button names; announced checkout errors and promo validation results.
- A public accessibility information page linked from the footer.
- A targeted ESLint accessibility check in CI for the updated customer journeys.
- Existing root skip link and reduced-motion support retained.

## Audit still required

This change is a targeted baseline, not a full audit. Before describing FunctionHour as conformant, test all public and authenticated routes, including organizer/admin tools and third-party experiences. Prioritize:

- Keyboard-only completion of discovery, sign-in, checkout, tickets, transfers/refunds, organizer event creation, and check-in.
- Screen-reader testing with VoiceOver/Safari and NVDA/Firefox; include mobile screen readers.
- Zoom/reflow at 200% and 400%, text spacing, orientation, high contrast settings, and reduced motion.
- WCAG contrast checks for text, controls, focus indicators, event artwork overlays, validation/error states, and selected/disabled states.
- Accessible alternatives to map interaction and QR-only/ticket-scanner workflows.
- Image alternatives for event flyers and organizer-uploaded media, captions/transcripts for any video/audio, and accessible authored event descriptions.
- Clerk, Stripe, Mapbox, and other third-party widgets and hosted pages.

Automated checks and lint rules can identify only some issues. They do not replace assistive-technology testing with disabled users or an independent WCAG audit.

## Operating practice

1. Include keyboard and screen-reader checks in release testing for changes to a user journey.
2. Record barriers with the affected route, action, browser/device, assistive technology, expected result, and actual result.
3. Fix blockers in checkout, ticket access, and event discovery before lower-impact visual refinements.
4. Recheck after shared CSS, navigation, component, or third-party integration changes.
5. Review the accessibility statement and testing evidence with qualified counsel before making legal or conformance claims.
