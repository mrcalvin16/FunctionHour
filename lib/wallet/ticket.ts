import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export async function getWalletTicket(ticketId: string) {
  const session = await auth();
  if (!session.userId) return { error: "Sign in to save this ticket.", status: 401 } as const;

  const token = await session.getToken({ template: "convex" });
  if (!token) return { error: "Unable to verify ticket ownership.", status: 401 } as const;

  let ticket: FunctionReturnType<typeof api.tickets.getTicketDetails>;
  try {
    // getTicketDetails checks ownership against the authenticated Convex identity.
    ticket = await fetchQuery(api.tickets.getTicketDetails, {
      ticketId: ticketId as Id<"tickets">,
    }, { token });
  } catch {
    return { error: "Ticket not found.", status: 404 } as const;
  }

  if (!ticket?.event) return { error: "Ticket not found.", status: 404 } as const;
  if (ticket.revokedAt != null || (ticket.status && !["active", "checked_in"].includes(ticket.status)) ||
    ticket.event.eventStatus === "cancelled" || ticket.event.eventStatus === "postponed" ||
    ticket.checkedIn || ticket.event.eventDate <= Date.now()) {
    return { error: "This ticket is no longer available for a wallet pass.", status: 409 } as const;
  }

  return { ticket: { ...ticket, event: ticket.event } } as const;
}

export function walletDate(timestamp: number) {
  return new Date(timestamp).toISOString();
}

export function walletVenue(event: { venueName?: string; city?: string; location: string }) {
  return [event.venueName, event.city].filter(Boolean).join(" · ") || event.location;
}
