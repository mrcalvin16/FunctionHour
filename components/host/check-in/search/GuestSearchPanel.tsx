"use client";

import type { Id } from "@/convex/_generated/dataModel";

export type Guest = {
  ticketId: Id<"tickets">;
  name: string;
  email?: string | null;
  orderNumber: string;
  ticketType: string;
  quantity: number;
  checkedIn: boolean;
};

type GuestSearchPanelProps = {
  guests: Guest[];
  search: string;
  onSearchChange: (value: string) => void;
  isSubmitting: boolean;
  onCheckIn: (
    ticketId: Id<"tickets">,
  ) => void | Promise<void>;
  onUndo: (
    ticketId: Id<"tickets">,
  ) => void | Promise<void>;
};

export default function GuestSearchPanel({
  guests,
  search,
  onSearchChange,
  isSubmitting,
  onCheckIn,
  onUndo,
}: GuestSearchPanelProps) {
  return (
    <section className="min-w-0 rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-black text-zinc-950">
              Guest search
            </h2>

            <p className="mt-1 text-xs text-zinc-700">
              Search by name, email, order, or QR value.
            </p>
          </div>

          <span className="text-xs font-semibold text-zinc-700">
            {guests.length} guests shown
          </span>
        </div>

        <input
          value={search}
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          placeholder="Search the guest list..."
          aria-label="Search guests"
          className="mt-4 h-12 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-sm text-zinc-950 outline-none placeholder:text-zinc-600 focus:border-orange-600 focus:ring-2 focus:ring-orange-200"
        />
      </div>

      <div className="max-h-[620px] divide-y divide-zinc-200 overflow-y-auto">
        {guests.length > 0 ? (
          guests.map((guest) => (
            <div
              key={guest.ticketId}
              className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 truncate font-bold text-zinc-950">
                    {guest.name}
                  </p>

                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-700">
                    {guest.ticketType}
                  </span>

                  {guest.quantity > 1 ? (
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-800">
                      {guest.quantity} guests
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 break-all text-sm text-zinc-700">
                  {guest.email || "No guest email"}
                  {" · "}
                  {guest.orderNumber}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                {guest.checkedIn ? (
                  <>
                    <span className="inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-800">
                      Checked in
                    </span>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onUndo(guest.ticketId)}
                      className="min-h-11 rounded-xl border border-zinc-300 px-4 text-xs font-bold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
                    >
                      Undo
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => onCheckIn(guest.ticketId)}
                    className="min-h-11 rounded-xl bg-zinc-950 px-4 text-xs font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Check in
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center">
            <p className="font-bold text-zinc-950">
              No guests found
            </p>

            <p className="mt-1 text-sm text-zinc-700">
              Try another name, email, order number, or QR value.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
