import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  alternates: { canonical: "/sign-up" },
  robots: { index: false, follow: true },
};

export default function SignUpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
