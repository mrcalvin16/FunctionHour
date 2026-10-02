"use client";

export function CheckInLoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-24 animate-pulse rounded-3xl border border-zinc-200 bg-zinc-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl border border-zinc-200 bg-zinc-100"
          />
        ))}
      </div>
      <div className="h-[520px] animate-pulse rounded-3xl border border-zinc-200 bg-zinc-100" />
    </div>
  );
}

export function WorkspaceLoadingState() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
      <div className="h-[580px] animate-pulse rounded-3xl border border-zinc-200 bg-zinc-100" />
      <div className="h-[580px] animate-pulse rounded-3xl border border-zinc-200 bg-zinc-100" />
    </div>
  );
}
