"use client";

import {
  Gauge,
  MapPin,
  ScanLine,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

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
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.15fr_repeat(3,minmax(0,.62fr))]">
        <button
          type="button"
          onClick={() => onScannerActiveChange(!scannerActive)}
          className={`flex min-h-20 items-center justify-between rounded-2xl px-5 text-left transition active:scale-[0.99] ${
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
              {scannerActive ? "Scanner ready" : "Open scanner"}
            </p>
          </div>
          <ScanLine className="h-7 w-7" />
        </button>

        <LiveMetric
          label="Entry pace"
          value={`${throughput.perMinute}/min`}
          detail={`${throughput.lastFiveMinutes} in 5 min`}
          icon={Gauge}
        />
        <LiveMetric
          label="15-min arrivals"
          value={throughput.lastFifteenMinutes.toLocaleString()}
          detail="Rolling window"
          icon={Users}
        />
        <LiveMetric
          label="Active gates"
          value={throughput.activeGates.toLocaleString()}
          detail={
            throughput.busiestGate
              ? `${throughput.busiestGate} leads`
              : "No recent entries"
          }
          icon={MapPin}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3 text-xs font-semibold text-zinc-700">
        <span className="inline-flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-700" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-amber-700" />
          )}
          {isOnline ? "Live sync connected" : "Offline queue active"}
        </span>
        <span>Live gate activity</span>
      </div>
    </section>
  );
}

function LiveMetric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="min-h-20 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-700">
          {label}
        </p>
        <Icon className="h-4 w-4 text-orange-700" />
      </div>
      <p className="mt-2 text-xl font-black tabular-nums text-zinc-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-zinc-700">
        {detail}
      </p>
    </div>
  );
}
