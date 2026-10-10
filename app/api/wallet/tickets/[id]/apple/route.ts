import { readFile } from "node:fs/promises";
import path from "node:path";
import { PKPass } from "passkit-generator";
import { getWalletTicket, walletDate, walletVenue } from "@/lib/wallet/ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const teamIdentifier = process.env.APPLE_WALLET_TEAM_ID?.trim();
  const passTypeIdentifier = process.env.APPLE_WALLET_PASS_TYPE_ID?.trim();
  const wwdr = process.env.APPLE_WALLET_WWDR_CERT_BASE64;
  const signerCert = process.env.APPLE_WALLET_SIGNER_CERT_BASE64;
  const signerKey = process.env.APPLE_WALLET_SIGNER_KEY_BASE64;
  if (!teamIdentifier || !passTypeIdentifier || !wwdr || !signerCert || !signerKey) {
    return Response.json({ error: "Apple Wallet is not configured yet." }, { status: 503 });
  }

  const { id } = await params;
  const result = await getWalletTicket(id);
  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  const { ticket } = result;
  const event = ticket.event;

  try {
    const [icon, icon2x] = await Promise.all([
      readFile(path.join(process.cwd(), "public/function-hour-favicon-32.png")),
      readFile(path.join(process.cwd(), "public/function-hour-favicon-48.png")),
    ]);
    const pass = new PKPass({
      "icon.png": icon,
      "icon@2x.png": icon2x,
      "pass.json": Buffer.from(JSON.stringify({
        formatVersion: 1,
        serialNumber: String(ticket._id),
        teamIdentifier,
        passTypeIdentifier,
        organizationName: "Function Hour",
        description: `Ticket for ${event.name}`,
        logoText: "Function Hour",
        foregroundColor: "rgb(255,255,255)",
        backgroundColor: "rgb(84,35,160)",
        labelColor: "rgb(255,214,159)",
        relevantDate: walletDate(event.eventDate),
        barcodes: [{ format: "PKBarcodeFormatQR", message: String(ticket._id), messageEncoding: "iso-8859-1" }],
        eventTicket: {
          primaryFields: [{ key: "event", label: "EVENT", value: event.name }],
          secondaryFields: [{ key: "date", label: "DATE", value: walletDate(event.eventDate), dateStyle: "PKDateStyleMedium", timeStyle: "PKDateStyleShort" }],
          auxiliaryFields: [{ key: "venue", label: "VENUE", value: walletVenue(event) }, { key: "type", label: "TICKET", value: ticket.ticketTypeName || "Admission" }],
          backFields: [
            { key: "holder", label: "Ticket holder", value: ticket.holder.name },
            { key: "entry", label: "Entry", value: "Entry is subject to live validation. Cancelled, refunded, or transferred tickets cannot be used." },
            { key: "manage", label: "Manage ticket", value: `https://functionhour.com/tickets/${ticket._id}` },
          ],
        },
      })),
    }, {
      wwdr: Buffer.from(wwdr, "base64"),
      signerCert: Buffer.from(signerCert, "base64"),
      signerKey: Buffer.from(signerKey, "base64"),
      signerKeyPassphrase: process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE,
    });

    const bytes = pass.getAsBuffer();
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `inline; filename="function-hour-${String(ticket._id).slice(-8)}.pkpass"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ error: "Unable to issue the wallet pass." }, { status: 503 });
  }
}
