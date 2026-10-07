import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Function Hour",
    short_name: "Function Hour",
    id: "/",
    description: "Discover events and manage your tickets with Function Hour.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/function-hour-icon-192.png?v=20261007", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/function-hour-icon-512.png?v=20261007", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
