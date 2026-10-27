"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Settings = { enabled: boolean; shippingPolicy: string; pickupInstructions: string; returnPolicy: string };

export default function EventMerchSettings({ eventId, settings }: { eventId: Id<"events">; settings: Settings }) {
  const save = useMutation(api.events.updateEventMerchSettings);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [shippingPolicy, setShippingPolicy] = useState(settings.shippingPolicy);
  const [pickupInstructions, setPickupInstructions] = useState(settings.pickupInstructions);
  const [returnPolicy, setReturnPolicy] = useState(settings.returnPolicy);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setEnabled(settings.enabled);
    setShippingPolicy(settings.shippingPolicy);
    setPickupInstructions(settings.pickupInstructions);
    setReturnPolicy(settings.returnPolicy);
  }, [settings.enabled, settings.shippingPolicy, settings.pickupInstructions, settings.returnPolicy]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await save({ eventId, enabled, shippingPolicy, pickupInstructions, returnPolicy });
      setMessage("Merchandise settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900">
      <summary className="cursor-pointer text-sm font-semibold">Merchandise settings</summary>
      <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          Offer merchandise for this event
        </label>
        <p className="text-xs text-zinc-500">Turning this off hides merchandise from buyers without deleting products or past orders.</p>
        {([
          ["Shipping policy", shippingPolicy, setShippingPolicy],
          ["Pickup instructions", pickupInstructions, setPickupInstructions],
          ["Returns and exchanges", returnPolicy, setReturnPolicy],
        ] as const).map(([label, value, setter]) => (
          <label key={label} className="block text-xs font-semibold">
            {label}
            <textarea className="mt-1 block w-full rounded-lg border border-zinc-300 p-3 text-sm font-normal" rows={3} maxLength={2000} value={value} onChange={(event) => setter(event.target.value)} placeholder="Optional — shown to buyers when relevant" />
          </label>
        ))}
        <button disabled={busy} type="submit" className="min-h-10 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save merchandise settings"}</button>
        {message && <p role="status" className="text-xs">{message}</p>}
      </form>
    </details>
  );
}
