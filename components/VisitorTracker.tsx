"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getPrivacyPreferences, PRIVACY_PREFERENCES_EVENT } from "@/lib/privacyPreferences";

export default function VisitorTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || /^\/(admin|host|api|sign-in|sign-up)(\/|$)/.test(pathname)) return;
    const track = () => {
      if (!getPrivacyPreferences().analytics) {
        sessionStorage.removeItem("functionhour:visitor-session");
        return;
      }
      let id = sessionStorage.getItem("functionhour:visitor-session");
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem("functionhour:visitor-session", id);
      }
      const path = pathname.replace(/\/events\/[^/]+/, "/events/:id").replace(/\/organizers\/[^/]+/, "/organizers/:id").replace(/\/tickets\/[^/]+/, "/tickets/:id");
      void fetch("/api/analytics/visit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, path }), keepalive: true,
      }).catch(() => undefined);
    };
    track();
    window.addEventListener(PRIVACY_PREFERENCES_EVENT, track);
    return () => window.removeEventListener(PRIVACY_PREFERENCES_EVENT, track);
  }, [pathname]);
  return null;
}
