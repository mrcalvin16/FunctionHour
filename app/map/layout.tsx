import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event map",
  alternates: { canonical: "/map" },
};

export default function MapLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
