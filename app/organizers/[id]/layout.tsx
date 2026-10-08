import type { Metadata } from "next";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const canonical = `/organizers/${encodeURIComponent(id)}`;
  let title = "Organizer profile | Function Hour";
  let description = "Meet this Function Hour organizer, discover upcoming experiences, and explore their past events.";
  let image = "/opengraph-image";
  try {
    const data = await getConvexClient().query(api.organizers.getOrganizerByUserId, { userId: id });
    if (data?.organizer) {
      title = `${data.organizer.organizerName || data.organizer.name || "Organizer"} | Function Hour`;
      description = data.organizer.bio || description;
      image = data.organizer.bannerUrl || data.organizer.avatarUrl || image;
    }
  } catch {
    // Sharing still has a branded image when the backend is temporarily unavailable.
  }
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { type: "profile", title, description, url: canonical, images: [{ url: image, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
