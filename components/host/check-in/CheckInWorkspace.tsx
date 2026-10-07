"use client";

import CheckInHeader from "./layout/CheckInHeader";
import CheckInContent from "./layout/CheckInContent";
import AttendanceProgress from "./cards/AttendanceProgress";
import StatsGrid from "./cards/StatsGrid";
import {
  CheckInLoadingState,
  WorkspaceLoadingState,
} from "./states/LoadingStates";
import NoEventsState from "./states/NoEventsState";
import NoAccessState from "./states/NoAccessState";
import CheckInResultOverlay from "./results/CheckInResultOverlay";
import { useCheckInWorkspace } from "./hooks/useCheckInWorkspace";
import type { Id } from "@/convex/_generated/dataModel";
import OfflineQueueStatus from "./cards/OfflineQueueStatus";
import EventDayControls from "./cards/EventDayControls";
import GateIssuePanel from "./cards/GateIssuePanel";

export default function CheckInWorkspace({
  initialEventId,
  lockEventSelection = false,
}: {
  initialEventId?: Id<"events">;
  lockEventSelection?: boolean;
}) {
  const {
    organizerEvents,
    eventId,
    scannerActive,
    setScannerActive,
    manualCode,
    setManualCode,
    search,
    setSearch,
    gate,
    setGate,
    isSubmitting,
    result,
    scannerInputRef,
    workspace,
    filteredGuests,
    attendancePercentage,
    soundEnabled,
    hapticsEnabled,
    toggleSound,
    toggleHaptics,
    isOnline,
    offlineQueueCount,
    isSyncingQueue,
    submitCode,
    performCheckIn,
    handleManualSubmit,
    handleScannerSubmit,
    handleUndo,
    handleEventChange,
    handleCameraError,
    handleResultClose,
  } = useCheckInWorkspace(initialEventId);

  if (organizerEvents === undefined) {
    return (
      <WorkspaceFrame>
        <CheckInLoadingState />
      </WorkspaceFrame>
    );
  }

  if (organizerEvents.length === 0) {
    return (
      <WorkspaceFrame>
        <NoEventsState />
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame>
      <CheckInHeader
        events={organizerEvents}
        eventId={eventId}
        gate={gate}
        lockEventSelection={lockEventSelection}
        onEventChange={handleEventChange}
        onGateChange={setGate}
        soundEnabled={soundEnabled}
        hapticsEnabled={hapticsEnabled}
        onSoundToggle={toggleSound}
        onHapticsToggle={toggleHaptics}
      />

      <OfflineQueueStatus
        isOnline={isOnline}
        queuedCount={offlineQueueCount}
        isSyncing={isSyncingQueue}
      />

      {workspace === undefined ? (
        <WorkspaceLoadingState />
      ) : workspace === null ? (
        <NoAccessState />
      ) : (
        <>
          <EventDayControls
            scannerActive={scannerActive}
            currentGate={gate}
            throughput={workspace.throughput}
            isOnline={isOnline}
            onScannerActiveChange={setScannerActive}
          />

          <AttendanceProgress
            eventName={workspace.event.name}
            dateString={workspace.event.dateString}
            venueName={workspace.event.venueName}
            location={workspace.event.location}
            checkedIn={workspace.stats.checkedIn}
            totalGuests={workspace.stats.totalGuests}
            attendancePercentage={attendancePercentage}
          />

          <StatsGrid
            checkedIn={workspace.stats.checkedIn}
            remaining={workspace.stats.remaining}
            totalGuests={workspace.stats.totalGuests}
            orders={workspace.stats.orders}
            attendancePercentage={attendancePercentage}
          />

          <CheckInContent
            scannerActive={scannerActive}
            gate={gate}
            isSubmitting={isSubmitting}
            manualCode={manualCode}
            scannerInputRef={scannerInputRef}
            filteredGuests={filteredGuests}
            search={search}
            recentActivity={workspace.recentActivity}
            onScannerActiveChange={setScannerActive}
            onManualCodeChange={setManualCode}
            onScannerSubmit={handleScannerSubmit}
            onManualSubmit={handleManualSubmit}
            onScan={(value) => submitCode(value, "qr")}
            onCameraError={handleCameraError}
            onSearchChange={setSearch}
            onCheckIn={(ticketId) =>
              performCheckIn(ticketId, "search")
            }
            onUndo={handleUndo}
          />
          {eventId && <GateIssuePanel eventId={eventId} />}
        </>
      )}

      {result ? (
        <CheckInResultOverlay
          result={result}
          onClose={handleResultClose}
        />
      ) : null}
    </WorkspaceFrame>
  );
}

function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {children}
    </div>
  );
}
