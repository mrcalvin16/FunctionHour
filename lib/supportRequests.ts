export const supportSiteUrl = () => {
  const explicit = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  const cloud = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (explicit) return explicit;
  if (cloud && cloud.endsWith(".convex.cloud")) return cloud.replace(/\.convex\.cloud$/, ".convex.site");
  throw new Error("Support storage is not configured.");
};

export async function supportStore(path: string, method: "GET" | "POST", body?: unknown) {
  const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!secret) throw new Error("Support storage is not configured.");
  const response = await fetch(new URL(path, supportSiteUrl()), {
    method,
    headers: {
      "x-functionhour-internal-secret": secret,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Support storage failed (${response.status}).`);
  return response.json();
}
