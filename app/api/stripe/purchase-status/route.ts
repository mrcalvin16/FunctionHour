import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to confirm your purchase." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("session_id");
  if (!id?.startsWith("cs_")) return NextResponse.json({ error: "Missing checkout reference." }, { status: 400 });
  try {
    const session = await getStripeClient().checkout.sessions.retrieve(id);
    const emails = user.emailAddresses.filter((address) => address.verification?.status === "verified").map((address) => address.emailAddress.toLowerCase());
    const owner = session.metadata?.buyerUserId;
    const email = (session.customer_email || session.customer_details?.email || "").toLowerCase();
    if (owner ? owner !== user.id : !emails.includes(email)) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
    return NextResponse.json({ paid: session.status === "complete" && session.payment_status === "paid", type: session.metadata?.checkoutType }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "We couldn’t confirm payment yet. Check your orders or try again." }, { status: 503 });
  }
}
