export function validateTicketPurchaseLimit(limit: number | undefined) {
  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 10)) {
    throw new Error("Ticket limit must be a whole number from 1 to 10.");
  }
}
export function assertTicketPurchaseQuantity(quantity: number, limit = 10) {
  validateTicketPurchaseLimit(limit);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > limit) {
    throw new Error(`This organizer allows up to ${limit} tickets per order.`);
  }
}
