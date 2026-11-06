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


## Core customer journey review

### Conclusion and evidence limits

Blind-user accessibility is **not yet verified end to end**. This review used live Chrome accessibility snapshots, a keyboard activation check, source inspection, TypeScript, and targeted ESLint. It did not run VoiceOver, NVDA, or an automated axe scan, and is not a WCAG conformance assessment.

The live public homepage and Secondliner's Ball detail page were inspected. The homepage's More filters button was activated with Enter; its expanded state and labeled native filter controls appeared in the accessibility snapshot. Direct checkout navigation reached the Clerk sign-in screen. No credentials were entered, tickets reserved, or purchases made. Authenticated checkout, Stripe payment, ticket access, and entry were inspected in source only.

### Findings addressed in this change

| Area | Evidence before the fix | Change | Verification |
| --- | --- | --- | --- |
| Trending event cards | Live snapshot repeated “Save event” and “Event image” links with no event-specific identity; save state was absent | Added event-specific accessible names and pressed state; removed redundant image alternative inside the named link | Source review, TypeScript, targeted lint |
| Ticket wallet filters | Source used tab/tablist roles without panel associations or tab keyboard behavior | Uses a labeled group of native toggle buttons with pressed state | Source review, TypeScript, targeted lint; authenticated screen-reader test pending |
| Dynamic results | Homepage and wallet result changes had no dedicated count announcement | Added polite status messages for matching events and visible tickets | Source review, TypeScript, targeted lint; actual speech timing pending |
| Ticket action and reference | Repeated Open ticket links lacked event context; short reference had no label | Added event-specific ticket link names and an explicit reference label | Source review, TypeScript, targeted lint |
| Offline ticket | Only a PNG image was downloadable | Added a plain-text download containing event, holder, venue, date, ticket type, reference and online-pass link; QR image download remains available | Source review, TypeScript, targeted lint; download and entry workflow testing pending |
| Reduced motion | Carousel programmatically requested smooth scrolling regardless of system preference | Respects prefers-reduced-motion in its scroll behavior | Source review, TypeScript, targeted lint |

### Existing foundations observed

- Public discovery search and category/city filters expose accessible names.
- Event detail presents event name, date, venue, description, and ticket action as text.
- Checkout source labels buyer name, email and promo fields, exposes selected ticket/add-on states, names quantity controls, and uses alert/status regions for errors and promo results.
- The map route links to an event list; organizer entry has a search interface by name, email, order or QR value. These alternatives still need end-to-end usability testing.
- Root page language, global focus styling, a skip link, and reduced-motion CSS are present.

### Release follow-up before making a conformance claim

| Priority | Open check | Required evidence |
| --- | --- | --- |
| High | Authenticated purchase and ticket retrieval with VoiceOver/Safari and NVDA/Firefox | Complete discovery → sign-in → ticket selection → Stripe test payment → ticket opening, including errors and focus order |
| High | Skip navigation behavior | The root skip target wraps page content including navigation on the homepage; confirm that activating it actually bypasses repeated navigation and correct the target placement |
| High | Flyer-only details | Compare event flyer text with the authored description; an event-name alt alone does not reproduce schedule or access information that appears only in artwork |
| High | Entry without independently positioning a QR code | Validate staff lookup with a test ticket, accessible reference and offline text details; do not promise that the text file itself grants entry |
| High | Color and focus contrast across actual computed styles | Measure text, selected states, focus rings and controls; broad light-mode !important overrides mean source utility classes alone are insufficient evidence |
| Medium | Zoom and mobile reflow | Keyboard and screen-reader checks at 200%/400% and mobile widths, including sticky controls and dialogs |
| Medium | Support chat, cookie dialogs, Clerk and Stripe | Confirm focus entry/return, Escape behavior, labeling, validation and no keyboard traps |
| Medium | Offline files | Verify that both downloads open, text is readable with assistive technology, and the online ticket remains accessible after reopening |

Standards used to organize follow-up: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), including non-text content, keyboard access, bypass blocks, name/role/value, and status messages. These are audit targets, not claims that those criteria pass.


## Signed-in follow-up and skip-navigation correction

Live Chrome keyboard and accessibility-tree checks confirmed: Upcoming/Past ticket filters update pressed state and result counts; an existing ticket opens with Enter and exposes event details, QR label and reference; the text download succeeds and contains the expected fields; checkout quantity changes update totals; unchecked purchase terms produce an alert; purchase history opens with Enter. No order was placed and no purchase terms were accepted. This evidence does not establish spoken output behavior in VoiceOver or NVDA.

The root skip-link wrapper included repeated navigation. Activating the link and then pressing Tab therefore returned focus to the home link. The shared skip control now moves focus to the page's main heading (or an explicitly marked content target), using the main landmark and wrapper as fallbacks. It temporarily makes a heading focusable without adding a normal Tab stop, preserves existing tabindex values, and scrolls the target into view. The next Tab should continue after that heading rather than restarting the header navigation. The anchor retains its existing fragment fallback when JavaScript is unavailable.

Pending evidence: production keyboard retest of the homepage, wallet and checkout after deployment, and actual VoiceOver/NVDA testing. Flyer-only information, measured contrast/reflow, third-party payment and entry still require their own checks.
