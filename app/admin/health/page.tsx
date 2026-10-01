import SystemHealthBoard from "@/components/admin/SystemHealthBoard";

export const dynamic = "force-dynamic";

export default function AdminHealthPage() {
  return <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Function Hour Operations</p>
    <h1 className="mt-2 text-3xl font-bold">System health</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">Review live service connections and queues. A green check means the specific probe succeeded; it does not certify payments, webhook delivery, or email arrival end to end.</p>
    <SystemHealthBoard />
  </main>;
}
