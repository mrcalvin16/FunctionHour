import type { Metadata } from "next";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convex";
import { attendeeEventDate, attendeeVenue } from "@/lib/attendeeDisplay";

async function loadEvent(id: string) {
  try {
    return await getConvexClient().query(api.events.getById, {
      eventId: id as Id<"events">,
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await loadEvent(id);
  if (!event) return { title: "Event Not Found", robots: { index: false, follow: false } };

  const title = event.name || "FunctionHour Event";
  const description = `${attendeeEventDate(event)} · ${attendeeVenue(event)}. ${event.description || `Explore ${title} on FunctionHour.`}`.slice(0, 280);
  const canonical = `/events/${id}`;
  const robots = event.isDemo || event.eventStatus === "cancelled" || event.eventStatus === "postponed"
    ? { index: false, follow: true }
    : { index: true, follow: true };

  return {
    title,
    description,
    robots,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: event.imageUrl ? [{ url: event.imageUrl, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: event.imageUrl ? [event.imageUrl] : undefined,
    },
  };
}

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await loadEvent(id);
  const timestamp = event?.eventDate;
  const startDate = typeof timestamp === "number" && Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toISOString()
    : event?.dateString && /^\d{4}-\d{2}-\d{2}$/.test(event.dateString)
      ? event.dateString
      : undefined;
  const locationName = event ? attendeeVenue(event) : "";
  const jsonLd = event && !event.isDemo && event.eventStatus !== "cancelled" && event.eventStatus !== "postponed" && startDate
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: event.name,
        description: event.description || event.name,
        startDate,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: `https://functionhour.com/events/${id}`,
        ...(event.imageUrl ? { image: [event.imageUrl] } : {}),
        ...(locationName ? {
          location: {
            "@type": "Place",
            name: locationName,
            address: {
              "@type": "PostalAddress",
              ...(event.venueAddress ? { streetAddress: event.venueAddress } : {}),
              ...(event.city ? { addressLocality: event.city } : {}),
              ...(event.state ? { addressRegion: event.state } : {}),
              addressCountry: "US",
            },
          },
        } : {}),
        offers: {
          "@type": "Offer",
          url: `https://functionhour.com/events/${id}`,
          price: Math.max(0, event.price ?? 0),
          priceCurrency: "USD",
        },
      }
    : null;
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      {children}
    </>
  );
}
