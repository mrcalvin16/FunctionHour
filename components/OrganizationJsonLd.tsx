export default function OrganizationJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://functionhour.com/#organization",
    name: "FunctionHour",
    url: "https://functionhour.com",
    description: "FunctionHour is an event discovery, ticketing, and event management platform helping people find experiences and organizers host events.",
    logo: "https://functionhour.com/function-hour-apple-icon.png",
    sameAs: ["https://www.instagram.com/functionhour/"],
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", email: "operations@functionhour.com" },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />;
}
