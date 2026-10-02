"use client";

export default function NoAccessState() {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
      <h2 className="text-xl font-black text-red-950">
        Unable to open this event
      </h2>

      <p className="mt-2 text-sm text-red-900">
        The event could not be found or you do not have
        permission to manage its check-in.
      </p>
    </div>
  );
}
