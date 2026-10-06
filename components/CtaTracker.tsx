"use client";
import { useEffect } from "react";
import { getPrivacyPreferences } from "@/lib/privacyPreferences";

export default function CtaTracker() {
  useEffect(() => {
    let lastClick = "";
    let lastTime = 0;
    function track(event: MouseEvent) {
      if (!getPrivacyPreferences().analytics || !(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLElement>("[data-cta], a, button");
      if (!button || location.pathname.startsWith("/admin") || location.pathname.startsWith("/host")) return;
      let cta = button.dataset.cta;
      const href = button.getAttribute("href")?.split("?")[0];
      if (!cta && href) {
        if (/^\/events\/[^/]+\/checkout$/.test(href)) cta = "get_tickets";
        else if (href === "/events") cta = "browse_events";
        else if (href === "/sign-up") cta = "sign_up";
        else if (href === "/sign-in") cta = "sign_in";
      }
      if (!cta) return;
      const now = Date.now();
      if (cta === lastClick && now - lastTime < 1000) return;
      lastClick = cta; lastTime = now;
      // Only route patterns are recorded, never search text, email, or query strings.
      const path = location.pathname.replace(/\/events\/[^/]+/, "/events/:id").replace(/\/organizers\/[^/]+/, "/organizers/:id").replace(/\/tickets\/[^/]+/, "/tickets/:id");
      void fetch("/api/analytics/cta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cta, path }), keepalive: true }).catch(() => undefined);
    }
    document.addEventListener("click", track);
    return () => document.removeEventListener("click", track);
  }, []);
  return null;
}
