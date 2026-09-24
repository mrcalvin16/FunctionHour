"use client";

import OrganizerOrb from "./OrganizerOrb";

type Organizer = {
  userId: string;
  eventCount: number;
};

type Props = {
  organizerStats: Organizer[];
};

export default function FeaturedHosts({
  organizerStats,
}: Props) {
  if (!organizerStats.length) return null;

  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-12 sm:px-7 lg:px-8">
      <div className="rounded-[1.8rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-violet-700">
            Featured Hosts
          </p>

          <h2 className="mt-2 text-2xl font-black text-zinc-950 sm:text-3xl">
            Organizers shaping the crowd.
          </h2>
        </div>

        <div className="-mx-2 flex gap-5 overflow-x-auto px-2 pb-3">
          {organizerStats.slice(0, 8).map((organizer) => (
            <div
              key={organizer.userId}
              className="min-w-[150px] rounded-[1.35rem] border border-zinc-200 bg-white px-4 py-5"
            >
              <OrganizerOrb
                userId={organizer.userId}
                eventCount={organizer.eventCount}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
