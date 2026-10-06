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
      { src: "/icon?v=fh-20261006", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
