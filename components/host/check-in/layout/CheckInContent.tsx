"use client";

import type {
  FormEvent,
  Ref,
} from "react";
import type { Id } from "@/convex/_generated/dataModel";
import ScannerPanel from "../scanner/ScannerPanel";
import GuestSearchPanel, {
  type Guest,
} from "../search/GuestSearchPanel";
import RecentActivityPanel, {
  type RecentActivityItem,
} from "../activity/RecentActivityPanel";
import {
  formatMethod,
  formatTime,
} from "../utils/formatters";

type CheckInContentProps = {
  scannerActive: boolean;
  gate: string;
  isSubmitting: boolean;
  manualCode: string;
  scannerInputRef: Ref<HTMLInputElement>;
  filteredGuests: Guest[];
  search: string;
  recentActivity: RecentActivityItem[];
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
  onSearchChange: (value: string) => void;
  onCheckIn: (
    ticketId: Id<"tickets">,
  ) => void | Promise<void>;
  onUndo: (
    ticketId: Id<"tickets">,
  ) => void | Promise<void>;
};

export default function CheckInContent({
  scannerActive,
  gate,
  isSubmitting,
  manualCode,
  scannerInputRef,
  filteredGuests,
  search,
  recentActivity,
  onScannerActiveChange,
  onManualCodeChange,
  onScannerSubmit,
  onManualSubmit,
  onScan,
  onCameraError,
  onSearchChange,
  onCheckIn,
  onUndo,
}: CheckInContentProps) {
  return (
    <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
      <div className="min-w-0 space-y-6">
        <ScannerPanel
          scannerActive={scannerActive}
          gate={gate}
          isSubmitting={isSubmitting}
          manualCode={manualCode}
          scannerInputRef={scannerInputRef}
          onScannerActiveChange={onScannerActiveChange}
          onManualCodeChange={onManualCodeChange}
          onScannerSubmit={onScannerSubmit}
          onManualSubmit={onManualSubmit}
          onScan={onScan}
          onCameraError={onCameraError}
        />

        <GuestSearchPanel
          guests={filteredGuests}
          search={search}
          onSearchChange={onSearchChange}
          isSubmitting={isSubmitting}
          onCheckIn={onCheckIn}
          onUndo={onUndo}
        />
      </div>

      <RecentActivityPanel
        recentActivity={recentActivity}
        formatMethod={formatMethod}
        formatTime={formatTime}
      />
    </section>
  );
}
