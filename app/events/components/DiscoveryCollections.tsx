"use client";

type DiscoveryCollectionsProps = {
  activeCollection: string;
  onSelect: (value: string) => void;
};

type Collection = {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  gradient: string;
};

const collections: Collection[] = [
  {
    key: "weekend",
    eyebrow: "This Weekend",
    title: "Outside after dark",
    description:
      "Nightlife, concerts, parties, and live experiences worth leaving home for.",
    gradient: "from-violet-600/30 via-fuchsia-600/10 to-transparent",
  },
  {
    key: "culture",
    eyebrow: "Culture & Community",
    title: "Made for the city",
    description:
      "Food, festivals, art, reunions, and community experiences near you.",
    gradient: "from-orange-600/30 via-rose-600/10 to-transparent",
  },
  {
    key: "connect",
    eyebrow: "Meet Your People",
    title: "Build your network",
    description:
      "Professional events, conferences, meetups, and spaces to make connections.",
    gradient: "from-blue-600/25 via-violet-600/10 to-transparent",
  },
];

export default function DiscoveryCollections({
  activeCollection,
  onSelect,
}: DiscoveryCollectionsProps) {
  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-10 sm:px-7 lg:px-8">
      <div className="mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-700">
          Curated For You
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-zinc-950 sm:text-3xl">
          Find the right kind of crowd.
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {collections.map((collection) => {
          const isActive = activeCollection === collection.key;

          return (
            <button
              key={collection.key}
              type="button"
              onClick={() => onSelect(isActive ? "all" : collection.key)}
              className={`group relative min-h-[230px] overflow-hidden rounded-[1.6rem] border p-6 text-left transition duration-300 hover:-translate-y-1 ${
                isActive
                  ? "border-violet-300/55 bg-white/[0.08]"
                  : "border-white/10 bg-white/[0.035] hover:border-white/25"
              }`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${collection.gradient}`}
              />

              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-zinc-200" />
              <div className="pointer-events-none absolute -right-3 top-12 h-24 w-24 rounded-full border border-zinc-200" />

              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-700">
                  {collection.eyebrow}
                </p>

                <h3 className="mt-5 max-w-[250px] text-2xl font-black tracking-[-0.04em] text-zinc-950">
                  {collection.title}
                </h3>

                <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-600">
                  {collection.description}
                </p>

                <p className="mt-6 text-sm font-black text-zinc-950">
                  {isActive
                    ? "Collection selected ✓"
                    : "Explore collection →"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
