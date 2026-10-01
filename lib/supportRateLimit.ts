import { createHmac } from "node:crypto";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export function getClientKey(request: Request, userId?: string | null) {
  if (userId) return `user:${userId}`;

  // Vercel sets this header at its edge; do not rely on a caller-supplied XFF
  // chain when a separate reverse proxy is placed ahead of the deployment.
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.split(",")[0]?.trim()
    || "unknown";
  return `ip:${ip}`;
}

export async function checkRateLimit(
  namespace: string,
  clientKey: string,
  options: RateLimitOptions,
) {
  const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
  if (!secret) throw new Error("Support rate limiting is not configured.");
  const key = createHmac("sha256", secret).update(`${namespace}:${clientKey}`).digest("hex");
  // Convex mutations serialize conflicting writes, so every serverless instance
  // observes the same limit. No raw IP address is stored in the bucket table.
  return getConvexClient().mutation(api.supportRateLimits.consume, {
    serverSecret: secret, key, ...options,
  });
}
