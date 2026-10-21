import Link from "next/link";
import { getStripeClient } from "@/lib/stripe/server";
export const dynamic = "force-dynamic";
export default async function DisputesPage() {
  let disputes: Awaited<ReturnType<ReturnType<typeof getStripeClient>["disputes"]["list"]>>["data"] = [];
  let error = "";
  try {
    disputes = (await getStripeClient().disputes.list({ limit: 100 })).data;
  } catch {
    error = "Stripe dispute data is unavailable. Verify credentials and permissions.";
  }
  const open = disputes.filter(d => !["won","lost","warning_closed"].includes(d.status));
  return <main className="mx-auto max-w-6xl space-y-6 px-5 py-10 text-zinc-900">
    <div><p className="text-xs font-bold uppercase tracking-widest text-violet-700">FunctionHour Finance</p>
      <h1 className="mt-2 text-3xl font-bold">Chargeback Defense Center</h1>
      <p className="mt-2 text-sm text-zinc-700">Review disputes, evidence deadlines, and Stripe case status. Only authorized admins can view this page.</p></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    <div className="grid grid-cols-2 gap-4"><div className="rounded-xl bg-white p-5"><p>Open or pending cases</p><p className="text-3xl font-bold">{open.length}</p></div>
      <div className="rounded-xl bg-white p-5"><p>Recent disputes (up to 100)</p><p className="text-3xl font-bold">{disputes.length}</p></div></div>
    <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-semibold">Cases</h2>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Dispute","Amount","Reason","Status","Evidence due","Action"].map(h=><th key={h} className="border-b p-3">{h}</th>)}</tr></thead>
      <tbody>{disputes.map(d => <tr key={d.id}><td className="border-b p-3 font-mono text-xs">{d.id}</td>
        <td className="border-b p-3">{new Intl.NumberFormat("en-US",{style:"currency",currency:d.currency.toUpperCase()}).format(d.amount/100)}</td>
        <td className="border-b p-3">{d.reason}</td><td className="border-b p-3">{d.status}</td>
        <td className="border-b p-3">{d.evidence_details?.due_by ? new Date(d.evidence_details.due_by*1000).toLocaleString() : "Not provided"}</td>
        <td className="border-b p-3"><a className="font-semibold text-violet-700" target="_blank" rel="noopener noreferrer" href={`https://dashboard.stripe.com/disputes/${encodeURIComponent(d.id)}`}>Review in Stripe ↗</a></td></tr>)}</tbody></table>
      {!disputes.length && !error && <p className="py-6 text-zinc-600">No Stripe disputes returned.</p>}</div>
    </section>
    <div className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">
      <p className="font-bold">Evidence and payout safeguards</p>
      <p className="mt-2">Always distinguish verified QR scans from manual admission. Existing order records already hold disputed proceeds at zero while open or lost. Review historic payouts, refund status and the response deadline in Stripe before acting. Evidence is not submitted automatically.</p>
    </div>
    <Link href="/admin/finance" className="font-semibold text-violet-700">Finance operations →</Link>
  </main>;
}
