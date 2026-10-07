"use client";

import { ScanLine, Wifi, WifiOff } from "lucide-react";

type Throughput = {
  lastFiveMinutes: number;
  lastFifteenMinutes: number;
  perMinute: number;
  activeGates: number;
  busiestGate: string | null;
  busiestGateCheckIns: number;
  isLimited: boolean;
};

export default function EventDayControls({
  scannerActive,
  currentGate,
  throughput,
  isOnline,
  onScannerActiveChange,
}: {
  scannerActive: boolean;
  currentGate: string;
  throughput: Throughput;
  isOnline: boolean;
  onScannerActiveChange: (active: boolean) => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => onScannerActiveChange(!scannerActive)}
          aria-pressed={scannerActive}
          className={`flex min-h-16 w-full items-center justify-between rounded-2xl px-5 text-left transition active:scale-[0.99] sm:max-w-xs ${
            scannerActive
              ? "bg-emerald-700 text-white hover:bg-emerald-800"
              : "bg-orange-500 text-zinc-950 hover:bg-orange-400"
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em]">
              {currentGate}
            </p>
            <p className="mt-1 text-lg font-black">
              {scannerActive ? "Pause scanner" : "Start scanning"}
            </p>
          </div>
          <ScanLine className="h-6 w-6" aria-hidden="true" />
        </button>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 text-xs font-semibold text-zinc-700">
        <span className="inline-flex items-center gap-1.5" role="status">
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-700" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-amber-700" />
          )}
          {isOnline ? "Connected" : "Offline queue active"}
        </span>
        <span><strong className="text-zinc-950">{throughput.lastFiveMinutes}</strong> arrivals in 5 min</span>
        <span><strong className="text-zinc-950">{throughput.activeGates}</strong> active gates</span>
      </div>
    </section>
  );
}
