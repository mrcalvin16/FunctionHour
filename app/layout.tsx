import CtaTracker from "@/components/CtaTracker";
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
  appleWebApp: {
    capable: true,
    title: "Function Hour",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/function-hour-tab-20261007.ico", type: "image/x-icon", sizes: "16x16 32x32 48x48" },
      { url: "/function-hour-favicon-32.png?v=20261007", type: "image/png", sizes: "32x32" },
      { url: "/function-hour-favicon-48.png?v=20261007", type: "image/png", sizes: "48x48" },
    ],
    shortcut: "/function-hour-tab-20261007.ico",
    apple: [{ url: "/function-hour-apple-icon.png?v=20261007", sizes: "180x180", type: "image/png" }],
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
            <CtaTracker />
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
