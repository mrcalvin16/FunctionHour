"use client";

import { CloudOff, RefreshCw, Wifi } from "lucide-react";

export default function OfflineQueueStatus({
  isOnline,
  queuedCount,
  isSyncing,
}: {
  isOnline: boolean;
  queuedCount: number;
  isSyncing: boolean;
}) {
  if (isOnline && queuedCount === 0) return null;

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isOnline
          ? "border-blue-200 bg-blue-50"
          : "border-amber-300 bg-amber-50"
      }`}
      role="status"
    >
      <div className="flex items-center gap-3">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-blue-700" />
        ) : (
          <CloudOff className="h-4 w-4 text-amber-800" />
        )}
        <div>
          <p className="text-xs font-black text-zinc-950">
            {isOnline ? "Connection restored" : "Offline mode active"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-700">
            {queuedCount > 0
              ? `${queuedCount} check-in${queuedCount === 1 ? "" : "s"} waiting to sync`
              : "Scans will be securely queued on this device"}
          </p>
        </div>
      </div>

      {isSyncing ? (
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-800">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Syncing
        </span>
      ) : null}
    </div>
  );
}
