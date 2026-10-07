"use client";

import { useCallback, useEffect, useState } from "react";

const key = "functionhour.preferredCity";
const changed = "functionhour:preferred-city";

export function usePreferredCity() {
  const [city, setCity] = useState("All Cities");
  useEffect(() => {
    const sync = () => {
      try { setCity(localStorage.getItem(key) || "All Cities"); } catch { /* Browsing still works without storage. */ }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(changed, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(changed, sync); };
  }, []);
  const chooseCity = useCallback((value: string) => {
    setCity(value);
    try { localStorage.setItem(key, value); window.dispatchEvent(new Event(changed)); } catch { /* Keep the selection for this visit. */ }
  }, []);
  return [city, chooseCity] as const;
}
