"use client";

import { useEffect, useState } from "react";

type MapAppearance = "light" | "dark";

function localAppearance(): MapAppearance {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "light" : "dark";
}

export function useLocalMapStyle() {
  // Start with the site's light default so server and client render identically.
  const [appearance, setAppearance] = useState<MapAppearance>("light");

  useEffect(() => {
    const update = () => setAppearance(localAppearance());
    update();
    const interval = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return {
    appearance,
    mapStyle: `mapbox://styles/mapbox/${appearance}-v11`,
  };
}
