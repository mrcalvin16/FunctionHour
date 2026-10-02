"use client";

export default function NoEventsState() {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">
        Door Operations
      </p>

      <h1 className="mt-3 text-3xl font-black text-zinc-950">
        No events available
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-700">
        Create an event before opening the Check-In workspace.
      </p>
    </div>
  );
}
