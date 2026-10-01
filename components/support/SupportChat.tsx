"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Send, X } from "lucide-react";
import { answerSupportQuestion, supportCategories, type SupportCategory } from "@/lib/supportFaq";

const questions = ["Where are my tickets?", "How do refunds work?", "Report an event", "Where are my merch orders?"];

export default function SupportChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof answerSupportQuestion> | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<SupportCategory>("ticket_help");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function ask(value: string) {
    if (!value.trim()) return;
    setQuestion(value);
    setAnswer(answerSupportQuestion(value));
    if (/report|unsafe|scam/i.test(value)) setCategory("report_event");
    else if (/refund|cancel/i.test(value)) setCategory("refund");
    else if (/merch|shipping/i.test(value)) setCategory("merch");
    else if (/charge|payment/i.test(value)) setCategory("payment");
    else if (/ticket|qr|order/i.test(value)) setCategory("ticket_help");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/support/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, name, email, message, website, pagePath: pathname || "/",
          eventUrl: pathname?.startsWith("/events/") ? pathname : undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit your request.");
      setNotice(result.reference
        ? `Request received. Reference: ${result.reference}. Operations can review it in the admin portal.`
        : "Request received.");
      setMessage("");
      setShowForm(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to submit your request.");
    } finally {
      setBusy(false);
    }
  }

  const isFlyerStudio = pathname?.startsWith("/host/flyer-studio");
  return (
    <div className={`fixed z-[70] ${isFlyerStudio ? "bottom-3 left-3" : "bottom-5 right-5"}`}>
      {open && (
        <section aria-label="Chev support" className="mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white text-zinc-950 shadow-2xl">
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <div><h2 className="font-bold">Chev</h2><p className="text-xs text-zinc-700">Function Hour help</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Chev" className="rounded-full p-2 hover:bg-zinc-100"><X size={20} /></button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <p className="rounded-2xl bg-violet-50 p-3 text-sm leading-6">Hi! I use Function Hour’s help pages to answer common questions. For account, payment, ticket, refund, or safety issues, you can send a request to Operations.</p>
            {!showForm && (
              <>
                <div className="flex flex-wrap gap-2">
                  {questions.map((item) => <button key={item} type="button" onClick={() => ask(item)} className="rounded-full border border-zinc-300 px-3 py-2 text-xs font-semibold hover:bg-zinc-100">{item}</button>)}
                </div>
                {answer && <div className="rounded-2xl border border-zinc-200 p-4 text-sm leading-6">
                  <p className="font-semibold">{question}</p><p className="mt-2">{answer.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{answer.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800">{link.label}</Link>)}</div>
                  {answer.requestHelp && <button type="button" onClick={() => { setShowForm(true); setNotice(""); }} className="mt-4 font-semibold text-violet-700 underline">Send a support request</button>}
                </div>}
                <form onSubmit={(event) => { event.preventDefault(); ask(question); }} className="flex gap-2">
                  <label htmlFor="chev-question" className="sr-only">Ask Chev</label>
                  <input id="chev-question" value={question} onChange={(event) => { setQuestion(event.target.value); setAnswer(null); }} maxLength={300} placeholder="Ask a question" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                  <button type="submit" aria-label="Ask" className="rounded-xl bg-zinc-950 px-3 text-white"><Send size={16} /></button>
                </form>
                <button type="button" onClick={() => { setShowForm(true); setNotice(""); }} className="w-full rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white hover:bg-violet-800">Contact Operations</button>
              </>
            )}
            {showForm && <form onSubmit={submit} className="space-y-3 text-sm">
              <h3 className="text-lg font-bold">Send a support request</h3>
              <p className="text-zinc-700">Operations will receive this in the admin portal at operations@functionhour.com. Do not include passwords, codes, QR passes, or full card numbers.</p>
              <label className="block font-semibold">Topic<select value={category} onChange={(event) => setCategory(event.target.value as SupportCategory)} className="mt-1 w-full rounded-xl border border-zinc-300 bg-white p-3">{supportCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="block font-semibold">Name (optional)<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="mt-1 w-full rounded-xl border border-zinc-300 p-3" /></label>
              <label className="block font-semibold">Email for a reply<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="mt-1 w-full rounded-xl border border-zinc-300 p-3" /></label>
              <label className="block font-semibold">What happened?<textarea required minLength={10} maxLength={2000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-zinc-300 p-3" /></label>
              <label className="sr-only">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
              <div className="flex gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-zinc-300 px-4 py-3 font-semibold">Back</button><button type="submit" disabled={busy} className="flex-1 rounded-xl bg-violet-700 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Sending…" : "Send request"}</button></div>
            </form>}
            {notice && <p role="status" className="rounded-xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-950">{notice}</p>}
          </div>
        </section>
      )}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Close Chev" : "Open Chev"} className="ml-auto flex min-h-12 items-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-xl"><MessageCircle size={20} /><span>Help</span></button>
    </div>
  );
}
