import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Join Function Hour to discover, save, and host events.",
  openGraph: { title: "Join Function Hour", description: "Create your Function Hour account.", url: "/sign-up", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Join Function Hour", description: "Create your Function Hour account.", images: ["/opengraph-image"] },
  alternates: { canonical: "/sign-up" },
  robots: { index: false, follow: true },
};

export default function SignUpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
