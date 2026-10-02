type AttendanceProgressProps = {
  eventName: string;
  dateString?: string;
  venueName?: string;
  location?: string;
  checkedIn: number;
  totalGuests: number;
  attendancePercentage: number;
};

export default function AttendanceProgress({
  eventName,
  dateString,
  venueName,
  location,
  checkedIn,
  totalGuests,
  attendancePercentage,
}: AttendanceProgressProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-black text-zinc-950">
              {eventName}
            </h2>

            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800">
              Selected event
            </span>
          </div>

          <p className="mt-1 text-sm text-zinc-700">
            {dateString || "Date not set"}
            {" · "}
            {venueName || location || "Venue not set"}
          </p>
        </div>

        <div className="min-w-0 lg:w-[360px]">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700">
              Attendance progress
            </span>

            <span className="font-black text-zinc-950">
              {checkedIn} / {totalGuests}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-orange-400 transition-all duration-500"
              style={{
                width: `${attendancePercentage}%`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
