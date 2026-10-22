/** Ticket service fee and cent-exact allocation shared by pricing, checkout UI, and Stripe. */
export const TICKET_SERVICE_RATE = 0.037;
export const TICKET_SERVICE_FLAT_CENTS = 178;

export function ticketFeeCents(unitCents: number): number {
  if (!Number.isSafeInteger(unitCents) || unitCents < 0) throw new Error("Invalid ticket amount");
  return unitCents === 0 ? 0 : Math.round(unitCents * TICKET_SERVICE_RATE) + TICKET_SERVICE_FLAT_CENTS;
}

export function allocateTicketCents(subtotalCents: number, quantity: number) {
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents < 0 ||
      !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error("Invalid checkout allocation");
  }
  const base = Math.floor(subtotalCents / quantity);
  const remainder = subtotalCents % quantity;
  return [
    ...(quantity - remainder > 0 ? [{ unitCents: base, quantity: quantity - remainder }] : []),
    ...(remainder > 0 ? [{ unitCents: base + 1, quantity: remainder }] : []),
  ];
}

export function ticketFeeTotalCents(subtotalCents: number, quantity: number): number {
  return allocateTicketCents(subtotalCents, quantity)
    .reduce((sum, group) => sum + ticketFeeCents(group.unitCents) * group.quantity, 0);
}
