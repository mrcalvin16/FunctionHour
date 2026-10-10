"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type RequestStatus = { status: "new" | "in_progress" | "waiting_on_organizer" | "resolved"; createdAt: number; updatedAt: number; followUpAt?: number };

function StatusContent() {
  const params = useSearchParams();
  const reference = params.get("reference") || "";
  const [status, setStatus] = useState<RequestStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    if (!reference || !token) { setError("This status link is incomplete."); setLoading(false); return; }
    const controller = new AbortController();
    fetch("/api/support/status", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, token }), cache: "no-store", signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("This status link is unavailable. Contact Operations with your reference.");
      return response.json() as Promise<RequestStatus>;
    }).then(setStatus).catch((caught) => { if (!controller.signal.aborted) setError(caught.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reference]);

  const label = status?.status === "new" ? "Received" : status?.status === "in_progress" ? "In review" : status?.status === "waiting_on_organizer" ? "Waiting on organizer" : "Resolved";
  return <main className="min-h-screen bg-[#fffaf7] px-5 py-12 text-zinc-950">
    <section className="mx-auto max-w-xl rounded-3xl border border-violet-200 bg-white p-6 shadow-sm sm:p-10">
      <Link href="/" className="text-sm font-black text-violet-800">← Function Hour</Link>
      <h1 className="mt-8 text-3xl font-black">Your support request</h1>
      {loading ? <p role="status" className="mt-5">Checking status…</p> : error ? <p role="alert" className="mt-5 text-red-800">{error}</p> : status && <>
        <p className="mt-3 break-all text-sm text-zinc-700">Reference {reference}</p>
        <div role="status" className="mt-6 rounded-2xl bg-violet-50 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-violet-800">Current status</p>
          <p className="mt-2 text-2xl font-black">{label}</p>
          <p className="mt-2 text-sm text-zinc-700">Updated {new Date(status.updatedAt).toLocaleString()}</p>
        </div>
        {status.followUpAt && status.status !== "resolved" ? <p className="mt-5 text-sm text-zinc-800">Operations plans to follow up by {new Date(status.followUpAt).toLocaleString()}. Timing may change with request volume.</p> : status.status !== "resolved" ? <p className="mt-5 text-sm text-zinc-800">Operations aims to respond by email within 2 business days. Timing may vary with request volume.</p> : <p className="mt-5 text-sm text-zinc-800">Your case has been marked resolved. Check your email for the outcome, or contact Operations if you still need help.</p>}
      </>}
      <a href={`mailto:operations@functionhour.com?subject=${encodeURIComponent(`Function Hour support ${reference}`)}`} className="mt-7 inline-flex min-h-11 items-center rounded-xl border border-zinc-300 px-4 text-sm font-bold text-zinc-900">Contact Operations</a>
    </section>
  </main>;
}

export default function SupportStatusPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#fffaf7] p-8">Loading request…</main>}><StatusContent /></Suspense>;
}
