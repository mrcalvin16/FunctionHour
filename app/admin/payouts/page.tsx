import { notFound } from "next/navigation";
import PayoutLedger from "@/components/admin/PayoutLedger";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export default async function PayoutLedgerPage() {
  if (!(await hasFunctionHourAdminAccess())) notFound();
  return <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Operations / Finance</p>
    <h1 className="mt-2 text-3xl font-bold text-zinc-950">Organizer payouts</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">Track every request from the recent ledger and inspect transferred funds against Stripe. Approval and reconciliation actions remain in the finance queue.</p>
    <PayoutLedger />
  </main>;
}
