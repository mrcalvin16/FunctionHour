# Ticket wallet passes

Function Hour can issue Apple Wallet event tickets and Google Wallet event tickets from `/tickets/[id]`. Each route requires the signed-in ticket owner, retrieves the current ticket through Convex, and declines a cancelled, refunded, revoked, checked-in, postponed, or past ticket. Both passes use the same ticket ID as the existing QR scanner. Staff check-in remains the authority on admission.

The buttons appear only when the corresponding server credentials are set. No wallet signing key is sent to the browser.

## Apple Wallet

1. Create a Pass Type ID for Function Hour in Apple Developer and a signing certificate for that ID. Export the certificate and private key as PEM, and obtain Apple's current WWDR intermediate certificate.
2. Set `APPLE_WALLET_TEAM_ID`, `APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_WWDR_CERT_BASE64`, `APPLE_WALLET_SIGNER_CERT_BASE64`, and `APPLE_WALLET_SIGNER_KEY_BASE64` in the production web deployment. Set `APPLE_WALLET_SIGNER_KEY_PASSPHRASE` if the private key is encrypted. Base64 values must represent the complete PEM file contents, including headers and line breaks.
3. Open a future ticket as its owner on an iPhone, download the pass, save it to Wallet, and scan it with the organizer check-in tool. Repeat with a cancelled or refunded test ticket and verify scanning refuses entry.

## Google Wallet

1. Create a Google Wallet issuer and grant its Google Cloud service account issuer access. Google may display a test-only label until publishing access is approved.
2. Set `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_WALLET_PRIVATE_KEY` in the production web deployment. Use the PEM private key from the authorized service account. Escaped `\n` sequences are supported.
3. Open a future ticket as its owner, save the pass, and scan it with the organizer check-in tool. Google Wallet creates a per-event class and per-ticket object from the signed save link.

## Current limitation

Saved passes are snapshots. The app blocks new downloads for invalid tickets and live staff scanning rejects invalid tickets, but previously saved passes are **not yet pushed updated status** when a ticket is cancelled, refunded, transferred, or checked in. Apple pass update web service and Google Wallet object updates are separate follow-up integrations. Do not describe a saved pass as proof of admission without a live scan. Keep the in-app ticket page available for current status.
