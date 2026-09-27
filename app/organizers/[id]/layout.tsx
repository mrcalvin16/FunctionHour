import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const canonical = `/organizers/${encodeURIComponent(id)}`;
  return {
    title: "Organizer profile",
    alternates: { canonical },
    openGraph: { url: canonical },
  };
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
