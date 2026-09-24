type PrintfulOrder = {
  externalId: string;
  recipient: { name: string; address1: string; address2: string; city: string; stateCode: string; zip: string; countryCode: string; email: string };
  items: Array<{ variantId: number; quantity: number; retailPrice: string; name: string }>;
};

function ensurePrintfulEnabled() {
  if (process.env.PRINTFUL_ENABLED !== "true") {
    throw new Error("Printful integration is disabled.");
  }
}

function getPrintfulHeaders(includeJson = false) {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) throw new Error("PRINTFUL_API_TOKEN is not configured.");
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (includeJson) headers["Content-Type"] = "application/json";
  if (process.env.PRINTFUL_STORE_ID) headers["X-PF-Store-Id"] = process.env.PRINTFUL_STORE_ID;
  return headers;
}

export async function createPrintfulOrder(order: PrintfulOrder) {
  ensurePrintfulEnabled();
  const confirm = process.env.PRINTFUL_AUTO_CONFIRM === "true";
  const response = await fetch(`https://api.printful.com/orders?confirm=${confirm}`, {
    method: "POST",
    headers: getPrintfulHeaders(true),
    body: JSON.stringify({
      external_id: order.externalId,
      recipient: { name: order.recipient.name, address1: order.recipient.address1, address2: order.recipient.address2 || undefined, city: order.recipient.city, state_code: order.recipient.stateCode || undefined, zip: order.recipient.zip, country_code: order.recipient.countryCode, email: order.recipient.email || undefined },
      items: order.items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity, retail_price: item.retailPrice, name: item.name })),
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.result?.id) throw new Error(data.error?.message || data.error?.reason || "Printful rejected the order.");
  return { id: String(data.result.id), status: String(data.result.status || (confirm ? "pending" : "draft")) };
}

export async function getPrintfulOrderStatus(orderId: string) {
  ensurePrintfulEnabled();
  const response = await fetch(`https://api.printful.com/orders/${encodeURIComponent(orderId)}`, { headers: getPrintfulHeaders(), cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.result) throw new Error(data.error?.message || data.error?.reason || "Unable to load the Printful order.");
  const shipment = Array.isArray(data.result.shipments) ? data.result.shipments.at(-1) : undefined;
  const status = String(data.result.status || "unknown");
  return { status, trackingNumber: shipment?.tracking_number ? String(shipment.tracking_number) : undefined, trackingUrl: shipment?.tracking_url ? String(shipment.tracking_url) : undefined, shipped: Boolean(shipment) || ["fulfilled", "shipped", "completed"].includes(status.toLowerCase()) };
}
