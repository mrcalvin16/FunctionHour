import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { sendSecurityAlert } from "@/lib/email/securityAlert";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return new Response("Webhook unavailable", { status: 503 });
  }
  let event;
  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (event.type === "user.updated") {
    const user = event.data;
    const email = user.email_addresses?.find(address => address.id === user.primary_email_address_id)?.email_address;
    if (email) {
      try {
        await sendSecurityAlert({
          to: email,
          action: "Your account profile or sign-in information was updated.",
          idempotencyKey: "clerk-user-updated-" + event.data.id + "-" + event.data.updated_at,
        });
      } catch (error) {
        console.error("Clerk account alert delivery failed", { userId: user.id, error });
        return new Response("Alert delivery failed", { status: 503 });
      }
    }
  }
  return Response.json({ received: true });
}
