import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  alternates: { canonical: "/events" },
  openGraph: { url: "/events" },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
