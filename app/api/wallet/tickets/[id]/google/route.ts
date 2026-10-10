import { createSign } from "node:crypto";
import { getWalletTicket, walletDate, walletVenue } from "@/lib/wallet/ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unavailable = () => Response.json({ error: "Google Wallet is not configured yet." }, { status: 503 });
const localized = (value: string) => ({ defaultValue: { language: "en-US", value } });
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!issuer || !email || !key) return unavailable();

  const { id } = await params;
  const result = await getWalletTicket(id);
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  const { ticket } = result;
  const event = ticket.event;
  const classId = `${issuer}.functionhour_event_${String(ticket.eventId).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const objectId = `${issuer}.functionhour_ticket_${String(ticket._id).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://functionhour.com";
  const payload = {
    iss: email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [new URL(origin).origin],
    payload: {
      eventTicketClasses: [{
        id: classId,
        issuerName: "Function Hour",
        reviewStatus: "UNDER_REVIEW",
        eventName: localized(event.name),
        venue: { name: localized(walletVenue(event)) },
        dateTime: { start: walletDate(event.eventDate) },
      }],
      eventTicketObjects: [{
        id: objectId,
        classId,
        state: "ACTIVE",
        ticketHolderName: ticket.holder.name,
        ticketNumber: String(ticket._id).slice(-8).toUpperCase(),
        barcode: { type: "QR_CODE", value: String(ticket._id), alternateText: String(ticket._id).slice(-8).toUpperCase() },
        hexBackgroundColor: "#5423A0",
      }],
    },
  };

  try {
    const input = `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}`;
    const signature = createSign("RSA-SHA256").update(input).end().sign(key).toString("base64url");
    const saveUrl = `https://pay.google.com/gp/v/save/${input}.${signature}`;
    // Google documents a practical 1,800-character limit for web save links.
    if (saveUrl.length > 1800) {
      return Response.json({ error: "This event needs a shorter wallet pass link." }, { status: 503 });
    }
    return new Response(null, { status: 303, headers: { Location: saveUrl, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return Response.json({ error: "Unable to issue the wallet pass." }, { status: 503 });
  }
}
