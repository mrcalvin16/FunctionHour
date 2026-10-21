import Link from "next/link";
import { notFound } from "next/navigation";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";
import { getStripeClient } from "@/lib/stripe/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export const dynamic = "force-dynamic";

export default async function DisputeEvidencePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasFunctionHourAdminAccess())) notFound();
  const { id } = await params;
  if (!/^dp_[a-zA-Z0-9_]+$/.test(id)) notFound();
  let error = "";
  let packet: Awaited<ReturnType<ReturnType<typeof getConvexClient>["query"]>> | null = null;
  let dispute: Awaited<ReturnType<ReturnType<typeof getStripeClient>["disputes"]["retrieve"]>> | null = null;
  try {
    dispute = await getStripeClient().disputes.retrieve(id);
    const paymentId = typeof dispute.payment_intent === "string"
      ? dispute.payment_intent : dispute.payment_intent?.id;
    if (paymentId) {
      const secret = process.env.STRIPE_WEBHOOK_SHARED_SECRET;
      if (!secret) throw new Error("Evidence lookup not configured");
      packet = await getConvexClient().query(api.disputeEvidence.forPaymentIntent, {
        serverSecret: secret, paymentIntentId: paymentId,
      });
    }
  } catch {
    error = "Could not retrieve dispute evidence. Check Stripe and Convex configuration.";
  }
  // Evidence packets contain customer information: never cache or expose through public routes.
  const evidence = packet as null | {
    paymentIntentId: string; checkoutSessionId: string; orderStatus: string;
    disputeStatus: string | null; amount: number; refundedAmount: number; currency: string;
    paidAt: number; buyerEmail: string; buyerName: string | null;
    terms: { version: string; refundPolicy: string; acceptedAt: number; feeRefundability: string } | null;
    event: { name: string; date: number; venue: string; status: string } | null;
    tickets: { id: string; status: string; revoked: boolean; checkedIn: boolean; checkedInAt: number | null; quantity: number }[];
    admission: { ticketId: string; method: string; checkedInAt: number; gate: string; staffRecorded: boolean }[];
    warnings: string[];
  };
  return <main className="mx-auto max-w-5xl space-y-6 px-5 py-10 text-zinc-900">
    <Link href="/admin/disputes" className="font-semibold text-violet-700">← Disputes</Link>
    <h1 className="text-3xl font-bold">Dispute evidence review</h1>
    <p className="text-sm text-zinc-600">Read-only case details. Verify records and Stripe deadline before responding. No evidence is sent automatically.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {dispute && <section className="rounded-xl border bg-white p-5">
      <h2 className="font-bold">Stripe dispute {dispute.id}</h2>
      <p className="mt-2">Status: {dispute.status} · Reason: {dispute.reason}</p>
      <p>Evidence due: {dispute.evidence_details?.due_by ? new Date(dispute.evidence_details.due_by * 1000).toLocaleString() : "Not specified"}</p>
      <a className="mt-3 inline-block font-semibold text-violet-700" href={`https://dashboard.stripe.com/disputes/${encodeURIComponent(dispute.id)}`} target="_blank" rel="noopener noreferrer">Review and respond in Stripe ↗</a>
    </section>}
    {dispute && !evidence && !error && <p className="rounded-xl bg-amber-50 p-4 text-amber-900">No matching FunctionHour ticket order found. Investigate before submitting evidence.</p>}
    {evidence && <>
      <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Purchase record</h2>
        <p className="mt-2">Buyer: {evidence.buyerName || "Not recorded"} ({evidence.buyerEmail})</p>
        <p>Payment: {evidence.paymentIntentId} · Session: {evidence.checkoutSessionId}</p>
        <p>Paid: {new Date(evidence.paidAt).toLocaleString()} · Amount: {evidence.amount.toFixed(2)} {evidence.currency.toUpperCase()}</p>
        <p>Status: {evidence.orderStatus} · Refunded: {evidence.refundedAmount.toFixed(2)}</p>
      </section>
      <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Event and terms</h2>
        <p className="mt-2">{evidence.event?.name || "Event not found"} · {evidence.event?.venue || "Venue not recorded"}</p>
        <p>Date: {evidence.event?.date ? new Date(evidence.event.date).toLocaleString() : "Not recorded"}</p>
        <p className="mt-2">Accepted terms: {evidence.terms ? `Version ${evidence.terms.version} on ${new Date(evidence.terms.acceptedAt).toLocaleString()}` : "Not recorded"}</p>
        {evidence.terms && <p className="mt-2 whitespace-pre-wrap">Refund policy: {evidence.terms.refundPolicy}</p>}
      </section>
      <section className="rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Ticket admission records</h2>
        <div className="mt-3 space-y-3">{evidence.tickets.map(t => <div key={t.id} className="rounded-lg bg-zinc-50 p-3">
          <p className="font-mono text-xs">{t.id}</p><p>Status: {t.status}{t.revoked ? " · Revoked" : ""} · Checked in: {t.checkedIn ? "Yes" : "No"}</p>
        </div>)}</div>
        <h3 className="mt-5 font-semibold">Recorded admissions</h3>
        {evidence.admission.map((a, i) => <p key={i} className="mt-2 text-sm">{a.method === "qr" ? "QR scan" : "Manual/search record"} · {new Date(a.checkedInAt).toLocaleString()} · {a.gate} · Staff recorded: {a.staffRecorded ? "Yes" : "No"}</p>)}
        {!evidence.admission.length && <p className="mt-2 text-sm">No admission record found.</p>}
      </section>
      {evidence.warnings.length > 0 && <section className="rounded-xl bg-amber-50 p-5 text-amber-900"><h2 className="font-bold">Evidence limitations</h2>
        {evidence.warnings.map(w => <p key={w} className="mt-2">{w}</p>)}
      </section>}
    </>}
  </main>;
}
