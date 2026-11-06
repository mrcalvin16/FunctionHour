/** One booker's contact for the entire order, not individual guest details. */
export function normalizeTicketBuyerContact(name: unknown, email: unknown) {
  const buyerName = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!buyerName) throw new Error("Full name is required.");
  if (buyerName.length > 100) throw new Error("Full name must be 100 characters or fewer.");

  const buyerEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (buyerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    throw new Error("Enter a valid email address for this order.");
  }
  return { buyerName, buyerEmail };
}
