import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "./ConvexClientProvider";
import SyncUserWithConvex from "@/components/SyncUserWithConvex";
import BackToHome from "@/components/navigation/BackToHome";
import SupportChat from "@/components/support/SupportChat";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://functionhour.com"),
  title: {
    default: "Function Hour | Find Your Function",
    template: "%s | Function Hour",
  },
  description: "Find events, make plans, and host unforgettable functions near you.",
  applicationName: "Function Hour",
  icons: {
    icon: "/function-hour-mark.svg",
    shortcut: "/function-hour-mark.svg",
    apple: "/function-hour-mark.svg",
  },
  openGraph: {
    type: "website",
    siteName: "Function Hour",
    url: "https://functionhour.com",
    title: "Function Hour | Find Your Function",
    description: "Good events. Better hours. Find your next function.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Function Hour" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Function Hour | Find Your Function",
    description: "Good events. Better hours. Find your next function.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={{
        variables: {
          colorPrimary: "#7c3aed",
          colorText: "#18181b",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#18181b",
          borderRadius: "1rem",
        },
      }}
      localization={{
        signIn: {
          start: {
            title: "Sign in to Function Hour",
            subtitle: "Welcome back. Sign in to access your tickets and events.",
          },
        },
        signUp: {
          start: {
            title: "Join Function Hour",
            subtitle: "Create your account to discover, save, and host events.",
          },
        },
      }}
    >
      <html lang="en" className="light" suppressHydrationWarning>
        <body>
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <ConvexClientProvider>
            <SyncUserWithConvex />
            <BackToHome />
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
            <SupportChat />
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
