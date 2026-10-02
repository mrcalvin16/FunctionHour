"use client";

import type {
  FormEvent,
  Ref,
} from "react";
import CameraScanner from "../CameraScanner";

type ScannerPanelProps = {
  scannerActive: boolean;
  gate: string;
  isSubmitting: boolean;
  manualCode: string;
  scannerInputRef: Ref<HTMLInputElement>;
  onScannerActiveChange: (active: boolean) => void;
  onManualCodeChange: (value: string) => void;
  onScannerSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  onManualSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  onScan: (value: string) => void | Promise<void>;
  onCameraError: (message: string) => void;
};

export default function ScannerPanel({
  scannerActive,
  gate,
  isSubmitting,
  manualCode,
  scannerInputRef,
  onScannerActiveChange,
  onManualCodeChange,
  onScannerSubmit,
  onManualSubmit,
  onScan,
  onCameraError,
}: ScannerPanelProps) {
  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-black text-zinc-950">
            QR scanner
          </h2>

          <p className="mt-1 text-xs text-zinc-700">
            Supports camera scans and hardware QR scanners.
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
            scannerActive
              ? "bg-emerald-100 text-emerald-800"
              : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {scannerActive
            ? `${gate} active`
            : "Scanner off"}
        </span>
      </div>

      <div className="p-5">
        <CameraScanner
          active={scannerActive}
          disabled={isSubmitting}
          onActiveChange={onScannerActiveChange}
          onScan={onScan}
          onError={onCameraError}
        />

        <form
          onSubmit={onScannerSubmit}
          className="mt-5"
        >
          <label
            htmlFor="scanner-code"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-700"
          >
            Scanner input
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={scannerInputRef}
              id="scanner-code"
              name="scannerCode"
              disabled={!scannerActive || isSubmitting}
              autoComplete="off"
              placeholder={
                scannerActive
                  ? "Scan QR code now..."
                  : "Start scanner to enable"
              }
              className="h-12 min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none placeholder:text-zinc-600 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-600"
            />

            <button
              type="submit"
              disabled={!scannerActive || isSubmitting}
              className="h-12 rounded-2xl bg-orange-500 px-6 text-sm font-black text-zinc-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Checking..."
                : "Process scan"}
            </button>
          </div>
        </form>

        <form
          onSubmit={onManualSubmit}
          className="mt-5 border-t border-zinc-200 pt-5"
        >
          <label
            htmlFor="manual-code"
            className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-700"
          >
            Manual validation
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="manual-code"
              value={manualCode}
              onChange={(event) =>
                onManualCodeChange(event.target.value)
              }
              disabled={isSubmitting}
              placeholder="Order number, QR value, or guest email"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none placeholder:text-zinc-600 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 disabled:bg-zinc-100 disabled:text-zinc-600"
            />

            <button
              type="submit"
              disabled={
                !manualCode.trim() || isSubmitting
              }
              className="h-12 rounded-2xl border border-zinc-300 bg-zinc-950 px-6 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Validate ticket
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
