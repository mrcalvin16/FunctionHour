import { escapeEmailHtml, sendTransactionalEmail } from "./server";

export async function sendSecurityAlert(input: {
  to: string;
  action: string;
  idempotencyKey: string;
}) {
  const text = `A change was made to your Function Hour account: ${input.action}.\n\nIf this was not you, contact operations@functionhour.com immediately and review your account and Stripe settings. Never send your password by email.`;
  await sendTransactionalEmail({
    to: input.to, subject: "Function Hour account activity alert",
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033">
      <p style="font-size:12px;font-weight:bold;letter-spacing:.15em;color:#6d28d9">FUNCTION HOUR · SECURITY</p>
      <h1 style="font-size:26px">Account activity</h1><p>${escapeEmailHtml(input.action)}</p>
      <p>If you did not make this change, contact <a href="mailto:operations@functionhour.com">operations@functionhour.com</a> and review your account and Stripe settings right away.</p>
      <p style="font-size:12px;color:#475569">We will never ask for your password by email.</p></div>`,
    idempotencyKey: input.idempotencyKey,
  });
}
