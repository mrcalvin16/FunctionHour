import type { Id } from "@/convex/_generated/dataModel";
import TicketPass from "@/components/tickets/TicketPass";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TicketPass ticketId={id as Id<"tickets">} walletAvailability={{
    apple: Boolean(process.env.APPLE_WALLET_TEAM_ID && process.env.APPLE_WALLET_PASS_TYPE_ID && process.env.APPLE_WALLET_WWDR_CERT_BASE64 && process.env.APPLE_WALLET_SIGNER_CERT_BASE64 && process.env.APPLE_WALLET_SIGNER_KEY_BASE64),
    google: Boolean(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_WALLET_PRIVATE_KEY),
  }} />;
}
