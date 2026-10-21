import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/events", "/cities"],
      disallow: [
        "/admin/",
        "/host/",
        "/api/",
        "/sign-in",
        "/sign-up",
        "/checkout",
        "/create-event",
        "/my-tickets",
      ],
    },
    sitemap: "https://functionhour.com/sitemap.xml",
    host: "https://functionhour.com",
  };
}
