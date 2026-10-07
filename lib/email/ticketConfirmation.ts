import { escapeEmailHtml } from "./server";

type TicketConfirmation = {
  eventName: string;
  ticketTypeName?: string;
  quantity: number;
  total?: number;
  currency?: string;
  ticketsUrl: string;
  buyerEmail: string;
};

export function ticketConfirmationEmail(details: TicketConfirmation) {
  const eventName = details.eventName.trim() || "your event";
  const ticketLabel = `${details.quantity} ${details.ticketTypeName?.trim() || "event"} ${details.quantity === 1 ? "ticket" : "tickets"}`;
  const total = details.total === undefined ? undefined : new Intl.NumberFormat("en-US", {
    style: "currency", currency: details.currency?.toUpperCase() || "USD",
  }).format(details.total);
  const subject = `You're in! Your tickets for ${eventName.replace(/[\r\n]+/g, " ")}`;
  const safeEvent = escapeEmailHtml(eventName);
  const safeLabel = escapeEmailHtml(ticketLabel);
  const safeEmail = escapeEmailHtml(details.buyerEmail);
  const safeUrl = escapeEmailHtml(details.ticketsUrl);
  const safeTotal = total ? escapeEmailHtml(total) : undefined;
  const logoUrl = escapeEmailHtml(new URL("/function-hour-icon-192.png", details.ticketsUrl).toString());

  return {
    subject,
    text: `You're in!\n\nYour ${ticketLabel} for ${eventName} ${details.quantity === 1 ? "is" : "are"} ready.${total ? `\nOrder total: ${total}` : ""}\n\nView your tickets: ${details.ticketsUrl}\n\nSign in with ${details.buyerEmail} to see your passes. Stripe sends a separate payment receipt.\n\nNeed help? Reply to this email and we'll be here.\n\nFunction Hour`,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your Function Hour tickets</title></head>
<body style="margin:0;padding:0;background-color:#f8f5fb;color:#21182e;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;color:#f8f5fb;max-height:0;max-width:0;opacity:0;overflow:hidden;">Your tickets for ${safeEvent} are ready. Open your passes in Function Hour.</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f8f5fb;"><tr><td align="center" style="padding:26px 14px 42px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e9e0ef;border-radius:20px;">
<tr><td style="padding:28px 28px 22px;border-bottom:1px solid #eee8f2;"><img src="${logoUrl}" width="42" height="42" alt="" style="display:inline-block;vertical-align:middle;border:0;" /> <span style="font-size:20px;font-weight:800;vertical-align:middle;letter-spacing:-.03em;color:#21182e;">Function<span style="color:#7b31c6;">Hour</span></span></td></tr>
<tr><td style="padding:32px 28px 10px;"><p style="margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.14em;color:#6b279e;">YOU'RE ON THE LIST</p><h1 style="margin:0;font-size:32px;line-height:1.15;letter-spacing:-.04em;color:#21182e;">You're in. The fun starts here.</h1><p style="margin:18px 0 0;font-size:16px;line-height:1.55;color:#4d4059;">Your spot at <strong style="color:#21182e;">${safeEvent}</strong> is confirmed. Your tickets are waiting in your Function Hour account.</p></td></tr>
<tr><td style="padding:18px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f6f0fc;border:1px solid #e7d8f4;border-radius:14px;"><tr><td style="padding:20px;"><p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.12em;color:#663195;">YOUR TICKETS</p><p style="margin:0;font-size:20px;font-weight:800;line-height:1.3;color:#21182e;">${safeEvent}</p><p style="margin:9px 0 0;font-size:15px;line-height:1.5;color:#403149;">${safeLabel}</p>${safeTotal ? `<p style="margin:12px 0 0;font-size:14px;color:#403149;">Order total: <strong>${safeTotal}</strong></p>` : ""}</td></tr></table></td></tr>
<tr><td style="padding:10px 28px 30px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#6d28b5" style="background-color:#6d28b5;border-radius:10px;"><a href="${safeUrl}" style="display:inline-block;padding:16px 24px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;">View your tickets&nbsp; →</a></td></tr></table><p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#51465a;">Sign in with <strong>${safeEmail}</strong> to see your passes. Stripe will send your payment receipt separately.</p></td></tr>
<tr><td style="padding:22px 28px;background-color:#fff9f2;border-top:1px solid #f0e9e1;border-radius:0 0 20px 20px;"><p style="margin:0;font-size:14px;line-height:1.6;color:#3f3546;">Need a hand? Just reply to this email. We're here to help.</p><p style="margin:12px 0 0;font-size:12px;color:#625569;">Function Hour · Events worth showing up for</p></td></tr>
</table><p style="max-width:560px;margin:18px 0;font-size:12px;line-height:1.6;color:#625569;">If the button doesn't work, copy this link into your browser:<br><a href="${safeUrl}" style="color:#5d248b;word-break:break-all;">${safeUrl}</a></p>
</td></tr></table></body></html>`,
  };
}
