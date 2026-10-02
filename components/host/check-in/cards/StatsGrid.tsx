type StatsGridProps = {
  checkedIn: number;
  remaining: number;
  totalGuests: number;
  orders: number;
  attendancePercentage: number;
};

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export default function StatsGrid({
  checkedIn,
  remaining,
  totalGuests,
  orders,
  attendancePercentage,
}: StatsGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Checked In"
        value={checkedIn.toLocaleString()}
        detail={`${attendancePercentage}% attendance`}
      />

      <StatCard
        label="Remaining"
        value={remaining.toLocaleString()}
        detail="Guests not yet admitted"
      />

      <StatCard
        label="Total Guests"
        value={totalGuests.toLocaleString()}
        detail="Across all ticket quantities"
      />

      <StatCard
        label="Orders"
        value={orders.toLocaleString()}
        detail="Ticket records"
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  detail,
}: StatCardProps) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-700">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black tracking-tight text-zinc-950">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-700">
        {detail}
      </p>
    </article>
  );
}
