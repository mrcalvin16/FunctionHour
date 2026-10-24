import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";
import OrganizationJsonLd from "@/components/OrganizationJsonLd";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <><OrganizationJsonLd /><HomePageClient /></>;
}
