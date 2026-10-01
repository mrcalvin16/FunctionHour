import { notFound } from "next/navigation";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import SupportRequestQueue from "@/components/admin/SupportRequestQueue";

export const dynamic = "force-dynamic";

export default async function SupportAdminPage() {
  if (!await hasFunctionHourAdminAccess()) notFound();
  return <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Function Hour Operations</p>
    <h1 className="mt-2 text-3xl font-bold">Support inbox</h1>
    <p className="mt-3 text-sm leading-6 text-zinc-700">Requests from Chev are saved here. Email alerts go to operations@functionhour.com when delivery is available.</p>
    <SupportRequestQueue />
  </main>;
}
