"use client";
import { useState } from "react";
import Link from "next/link";

export default function FeedbackPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "negative" | "suggestion">("suggestion");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSending(true); setStatus("");
    try {
      const response = await fetch("/api/support/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "other", email, pagePath: "/feedback",
          message: `[Product Feedback] [${sentiment}] ${message.trim()}`,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not submit feedback");
      setStatus("Thanks for helping us improve FunctionHour. Your feedback was received.");
      setMessage("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to submit"); }
    finally { setSending(false); }
  }
  return <main className="min-h-screen bg-[#fffaf7] px-5 py-12 text-zinc-900">
    <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
      <Link href="/" className="font-semibold text-violet-700">← FunctionHour</Link>
      <h1 className="mt-6 text-3xl font-black">Help shape FunctionHour</h1>
      <p className="mt-3 text-zinc-600">Tell us what worked, what didn't, or what you'd like us to improve.</p>
      <form onSubmit={submit} className="mt-7 space-y-5">
        <fieldset><legend className="font-semibold">How was your experience?</legend>
          <div className="mt-3 flex flex-wrap gap-3">{([["positive", "👍 Good"],["negative", "👎 Needs work"],["suggestion", "💡 Idea"]] as const).map(([value,label]) =>
            <label key={value} className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2"><input className="mr-2" type="radio" name="sentiment" checked={sentiment===value} onChange={()=>setSentiment(value)} />{label}</label>)}</div>
        </fieldset>
        <label className="block font-semibold">Email for follow-up
          <input type="email" required value={email} onChange={event=>setEmail(event.target.value)} maxLength={254} className="mt-2 w-full rounded-xl border p-3" placeholder="you@example.com"/>
        </label>
        <label className="block font-semibold">Your feedback
          <textarea required minLength={10} maxLength={1800} value={message} onChange={event=>setMessage(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border p-3" placeholder="Tell us what happened or what you'd like to see…"/>
        </label>
        <button disabled={sending} className="rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white disabled:opacity-50">{sending ? "Sending…" : "Send feedback"}</button>
        {status && <p role="status" className="text-sm text-zinc-700">{status}</p>}
      </form>
      <p className="mt-5 text-xs text-zinc-500">For urgent ticket, refund, or safety issues, use Chev support so we can respond quickly.</p>
    </div>
  </main>;
}
