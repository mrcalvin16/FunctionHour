const universeNodes = [
  { label: "Music", icon: "♪", position: "left-[11%] top-[2%] lg:left-[16%] lg:top-[3%]", size: "h-[68px] w-[68px] lg:h-[92px] lg:w-[92px]", background: "bg-[radial-gradient(circle_at_35%_30%,rgba(151,88,255,0.75),rgba(51,23,80,0.96)_58%,rgba(10,7,16,1))]" },
  { label: "Nightlife", icon: "▽", position: "right-[1%] top-[7%] lg:right-[9%]", size: "h-[72px] w-[72px] lg:h-[98px] lg:w-[98px]", background: "bg-[radial-gradient(circle_at_35%_30%,rgba(193,91,58,0.72),rgba(83,36,29,0.96)_58%,rgba(12,7,7,1))]" },
  { label: "Festivals", icon: "✺", position: "left-[1%] top-[41%] lg:left-[6%]", size: "h-[70px] w-[70px] lg:h-[96px] lg:w-[96px]", background: "bg-[radial-gradient(circle_at_35%_30%,rgba(166,118,45,0.72),rgba(66,44,16,0.96)_58%,rgba(10,8,5,1))]" },
  { label: "Arts", icon: "◉", position: "right-[17%] top-[47%] lg:right-[22%] lg:top-[48%]", size: "h-[68px] w-[68px] lg:h-[94px] lg:w-[94px]", background: "bg-[radial-gradient(circle_at_35%_30%,rgba(170,78,197,0.74),rgba(74,31,86,0.96)_58%,rgba(10,6,13,1))]" },
  { label: "Food", icon: "Ψ", position: "bottom-[1%] left-[22%] lg:bottom-[3%] lg:left-[28%]", size: "h-[68px] w-[68px] lg:h-[94px] lg:w-[94px]", background: "bg-[radial-gradient(circle_at_35%_30%,rgba(164,99,42,0.76),rgba(75,43,17,0.96)_58%,rgba(11,8,5,1))]" },
  { label: "Networking", icon: "◇", position: "bottom-[1%] right-0 lg:bottom-[3%] lg:right-[3%]", size: "h-[72px] w-[72px] lg:h-[100px] lg:w-[100px]", background: "bg-[radial-gradient(circle_at_35%_30%,rgba(75,101,190,0.75),rgba(31,43,91,0.96)_58%,rgba(7,8,15,1))]" },
];

export default function ExperienceUniverse({ totalEvents }: { totalEvents: number }) {
  return (
    <div role="img" aria-label="Function Hour experience universe: Music, Nightlife, Festivals, Arts, Food, and Networking" className="relative mx-auto h-[270px] w-full max-w-[630px] sm:h-[320px] lg:h-[380px]">
      <div className="absolute inset-0">
        <div className="absolute inset-[7%_3%_3%_4%] rounded-[50%] border border-violet-500/35 [transform:rotate(-9deg)]" />
        <div className="absolute inset-[14%_3%_8%_2%] rounded-[50%] border border-fuchsia-500/30 [transform:rotate(10deg)]" />
        <div className="absolute inset-[20%_9%_5%_10%] rounded-[50%] border border-orange-500/25 [transform:rotate(4deg)]" />
        <div className="absolute inset-[11%_11%_13%_16%] rounded-[50%] border border-violet-500/30 [transform:rotate(-18deg)]" />

        <div className="absolute left-[9%] top-[36%] h-3 w-3 rounded-full bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,1)]" />
        <div className="absolute right-[9%] top-[24%] h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,1)]" />
        <div className="absolute bottom-[17%] left-[20%] h-2.5 w-2.5 rounded-full bg-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,1)]" />

        <div className="absolute left-1/2 top-1/2 z-20 flex h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[7px] border-black bg-[radial-gradient(circle_at_35%_28%,rgba(184,99,255,0.9),rgba(70,28,77,0.98)_48%,rgba(25,14,14,1)_76%)] text-center shadow-[0_0_75px_rgba(168,85,247,0.35)] sm:h-[130px] sm:w-[130px] lg:h-[150px] lg:w-[150px] lg:border-[9px]">
          <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-rose-400 text-lg lg:mb-2 lg:h-9 lg:w-9 lg:text-xl">✦</div>
          <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-300 lg:text-[9px] lg:tracking-[0.34em]">Function</span>
          <span className="text-[18px] font-black leading-none text-white lg:text-[21px]">HOUR</span>
          <span className="mt-2 text-[8px] font-black uppercase leading-tight tracking-[0.18em] text-orange-300 lg:mt-3 lg:text-[9px] lg:tracking-[0.25em]">Experience<br />Universe</span>
        </div>

        {universeNodes.map((node) => (
          <div key={node.label} className={`experience-universe-node absolute ${node.position} ${node.size} z-10 flex flex-col items-center justify-center rounded-full border border-white/15 ${node.background} text-center shadow-[0_0_35px_rgba(255,255,255,0.08)]`}>
            <span className="text-lg text-white lg:text-2xl">{node.icon}</span>
            <span className="mt-1 text-[9px] font-black uppercase tracking-tight text-white lg:mt-2 lg:text-[10px] lg:tracking-[0.16em]">{node.label}</span>
          </div>
        ))}

        <div className="absolute bottom-[1%] right-[12%] z-20 hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700 shadow-sm sm:inline-flex lg:bottom-[4%] lg:right-[16%]">
          <span className="text-orange-600">⌖</span>
          Live around you
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-800">{totalEvents}</span>
        </div>
      </div>
    </div>
  );
}
