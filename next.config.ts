import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The legacy lint backlog is tracked separately during launch hardening.
  // TypeScript errors remain blocking in both Next builds and CI.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
    ],
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        // Restrict framing without imposing untested script/network policies on Clerk or Stripe.
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
      ],
    }];
  },
};

export default nextConfig;
