export const PRIVACY_PREFERENCES_KEY = "functionhour:privacy-preferences:v1";
export const PRIVACY_PREFERENCES_EVENT = "functionhour:privacy-preferences-updated";
export const EVENT_VIEW_SESSION_KEY = "functionhour:event-view-session";

export type PrivacyPreferences = {
  analytics: boolean;
  doNotSellOrShare: boolean;
};

export const defaultPrivacyPreferences: PrivacyPreferences = {
  analytics: true,
  doNotSellOrShare: false,
};

export function getPrivacyPreferences(): PrivacyPreferences {
  if (typeof window === "undefined") return defaultPrivacyPreferences;

  try {
    const stored = window.localStorage.getItem(PRIVACY_PREFERENCES_KEY);
    if (!stored) return defaultPrivacyPreferences;

    const parsed = JSON.parse(stored) as Partial<PrivacyPreferences>;
    const doNotSellOrShare = parsed.doNotSellOrShare === true;
    return {
      analytics: parsed.analytics !== false && !doNotSellOrShare,
      doNotSellOrShare,
    };
  } catch {
    return defaultPrivacyPreferences;
  }
}

export function savePrivacyPreferences(
  preferences: PrivacyPreferences,
): void {
  const normalized: PrivacyPreferences = {
    analytics: preferences.analytics && !preferences.doNotSellOrShare,
    doNotSellOrShare: preferences.doNotSellOrShare,
  };

  window.localStorage.setItem(
    PRIVACY_PREFERENCES_KEY,
    JSON.stringify(normalized),
  );

  if (normalized.doNotSellOrShare || !normalized.analytics) {
    window.sessionStorage.removeItem(EVENT_VIEW_SESSION_KEY);
  }

  window.dispatchEvent(new Event(PRIVACY_PREFERENCES_EVENT));
}
