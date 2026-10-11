import SecureEventExports from "@/components/host/SecureEventExports";

export default function ExportsPage() {
  return <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-8">
    <div><p className="text-sm font-bold uppercase tracking-widest text-orange-300">Organizer OS</p>
      <h1 className="mt-2 text-3xl font-bold text-white">Exports</h1>
      <p className="mt-2 text-zinc-200">Download event records for your own files.</p></div>
    <SecureEventExports/>
  </main>;
}
