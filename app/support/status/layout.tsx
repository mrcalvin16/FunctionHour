import type { Metadata } from "next";

export const metadata: Metadata = { title: "Support request status | Function Hour", robots: { index: false, follow: false } };

export default function SupportStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
