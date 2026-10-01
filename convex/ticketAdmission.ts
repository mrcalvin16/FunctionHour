/** Admission is decided on the server for every QR, manual, and guest-list path. */
export function isTicketEligibleForAdmission(ticket: {
  status?: string;
  revokedAt?: number;
}) {
  return ticket.revokedAt == null &&
    (ticket.status == null || ticket.status === "active" || ticket.status === "checked_in");
}
