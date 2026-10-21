import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover Events, Parties & Experiences",
  description: "Discover parties, festivals, nightlife, concerts and local experiences. Find your next event and buy tickets on FunctionHour.",
  alternates: { canonical: "/events" },
  openGraph: { url: "/events" },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
