import test from "node:test";
import assert from "node:assert/strict";
import {
  getPrivacyPreferences,
  savePrivacyPreferences,
  PRIVACY_PREFERENCES_KEY,
} from "./privacyPreferences.ts";

test("browser privacy signal overrides stored analytics consent and cannot be saved away", () => {
  const values = new Map([[PRIVACY_PREFERENCES_KEY, JSON.stringify({ analytics: true, doNotSellOrShare: false })]]);
  const priorWindow = globalThis.window;
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  try {
    globalThis.window = {
      localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
      sessionStorage: { removeItem: () => {} },
      dispatchEvent: () => {},
    };
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { globalPrivacyControl: true } });
    assert.deepEqual(getPrivacyPreferences(), { analytics: false, doNotSellOrShare: true });
    savePrivacyPreferences({ analytics: true, doNotSellOrShare: false });
    assert.deepEqual(JSON.parse(values.get(PRIVACY_PREFERENCES_KEY)), { analytics: false, doNotSellOrShare: true });
  } finally {
    if (priorWindow === undefined) delete globalThis.window; else globalThis.window = priorWindow;
    if (priorNavigator === undefined) delete globalThis.navigator; else Object.defineProperty(globalThis, "navigator", priorNavigator);
  }
});
