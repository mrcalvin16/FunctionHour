# Chev support operations

Chev uses the maintained answers in `content/support-faq.json` and links to Function Hour pages. It does not call OpenAI or consume model tokens. Keep answers brief and avoid promising refunds, ticket issuance, or event facts that are not verified on the linked page.

Visitors can submit ticket, refund, event/organizer report, payment, merch, account, and other requests. `POST /api/support/requests` rate limits and validates the form, redacts obvious payment numbers and secrets, then writes a case to Convex. It emails `operations@functionhour.com` via Resend. If email delivery fails, the case remains in `/admin/support` with a failed email-alert status. The visitor receives a reference only after storage succeeds.

Operations signs in as the verified `operations@functionhour.com` Clerk account to review the latest 100 requests at `/admin/support`, reply via email, and mark a case in progress or resolved. Avoid entering passwords, full payment card numbers, QR codes, or authentication codes in replies.

## Deployment and check

Deploy Convex functions and schema before the web release (`npx convex deploy --typecheck enable` against the production deployment). The web app needs `NEXT_PUBLIC_CONVEX_URL`, `STRIPE_WEBHOOK_SHARED_SECRET` matching the Convex deployment, and `RESEND_API_KEY`. If `NEXT_PUBLIC_CONVEX_SITE_URL` is unset, the web app derives the `.convex.site` address from the `.convex.cloud` URL. `/api/health/support` reports configuration state; it does not prove email delivery.

After deployment, submit one harmless test request with an authorized test email. Confirm the case appears in `/admin/support` and the alert reaches `operations@functionhour.com`; then resolve that case. Check that no OpenAI support endpoint is present.
