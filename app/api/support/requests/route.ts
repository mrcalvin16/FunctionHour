import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientKey } from "@/lib/supportRateLimit";
import { supportStore } from "@/lib/supportRequests";
import { escapeEmailHtml, sendTransactionalEmail } from "@/lib/email/server";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  category: z.enum(["ticket_help", "refund", "report_event", "payment", "merch", "account", "other"]),
  email: z.string().trim().email().max(254),
  name: z.string().trim().max(100).optional(),
  message: z.string().trim().min(10).max(2000),
  eventUrl: z.string().trim().max(400).optional(),
  pagePath: z.string().trim().max(300).default("/"),
  website: z.string().optional(), // Honeypot for automated submissions.
});

function safePath(value: string | undefined) {
  return value && /^\/[a-zA-Z0-9/_?=&%.-]*$/.test(value) ? value : "/";
}

function redactSensitive(value: string) {
  return value
    .replace(/\b(?:\d[ -]?){13,19}\b/g, "[payment number removed]")
    .replace(/\b(?:sk_live_|sk_test_|whsec_|pi_\w+_secret_)[A-Za-z0-9_]+\b/g, "[secret removed]");
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : requestOrigin;
  if (origin !== requestOrigin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 6000) {
    return NextResponse.json({ error: "Request is too long." }, { status: 413 });
  }

  try {
    const session = await auth();
    const rate = await checkRateLimit("support-intake", getClientKey(request, session.userId), { limit: 3, windowMs: 3_600_000 });
    if (!rate.allowed) return NextResponse.json({ error: "Too many support requests. Please try again later." }, {
      status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) },
    });

    const input = requestSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ error: "Check your email and message, then try again." }, { status: 400 });
    if (input.data.website) return NextResponse.json({ received: true });

    const user = session.userId ? await currentUser() : null;
    const verifiedEmail = user?.emailAddresses.find((item) =>
      item.emailAddress.toLowerCase() === input.data.email.toLowerCase() && item.verification?.status === "verified");
    // A signed-in user may submit for another address, but the email is treated as unverified.
    const email = verifiedEmail?.emailAddress ?? input.data.email;
    const message = redactSensitive(input.data.message);
    const eventUrl = input.data.eventUrl && /^\/events\/[a-zA-Z0-9_-]+(?:\?.*)?$/.test(input.data.eventUrl)
      ? input.data.eventUrl : undefined;
    const data = {
      category: input.data.category, email, name: input.data.name || undefined, message,
      eventUrl, pagePath: safePath(input.data.pagePath),
    };
    const created = await supportStore("/support/requests", "POST", data) as { id: string };
    let notificationStatus: "delivered" | "failed" = "failed";
    try {
      const text = `New Function Hour support request\n\nReference: ${created.id}\nCategory: ${data.category}\nFrom: ${data.name || "Not provided"} <${data.email}>\nPage: ${data.pagePath}\nEvent: ${data.eventUrl || "Not provided"}\n\n${data.message}\n\nReview: https://functionhour.com/admin/support`;
      await sendTransactionalEmail({
        to: "operations@functionhour.com",
        replyTo: data.email,
        subject: `Function Hour support: ${data.category.replaceAll("_", " ")}`,
        text,
        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#171717"><h1>New support request</h1><p>Reference: ${escapeEmailHtml(created.id)}</p><p>Category: ${escapeEmailHtml(data.category)}</p><p>From: ${escapeEmailHtml(data.name || "Not provided")} &lt;${escapeEmailHtml(data.email)}&gt;</p><p>Page: ${escapeEmailHtml(data.pagePath)}</p><p>Event: ${escapeEmailHtml(data.eventUrl || "Not provided")}</p><p style="white-space:pre-wrap">${escapeEmailHtml(data.message)}</p><p><a href="https://functionhour.com/admin/support">Review in Operations</a></p></div>`,
        idempotencyKey: `support-request-${created.id}`,
      });
      notificationStatus = "delivered";
    } catch (error) {
      console.error("[support.intake] Email notification failed", { id: created.id, error });
    }
    try {
      await supportStore("/support/requests/notification", "POST", { id: created.id, status: notificationStatus });
    } catch (error) {
      console.error("[support.intake] Notification status update failed", { id: created.id, error });
    }
    return NextResponse.json({ received: true, reference: created.id, notificationStatus });
  } catch (error) {
    console.error("[support.intake] Request failed", error);
    return NextResponse.json({ error: "We could not submit your request. Please email operations@functionhour.com." }, { status: 503 });
  }
}
