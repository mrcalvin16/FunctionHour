"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Minus, Send, X } from "lucide-react";
import { answerSupportQuestion, supportCategories, type SupportCategory } from "@/lib/supportFaq";

const questions = ["Where are my tickets?", "How do refunds work?", "Report an event", "Where are my merch orders?"];

type ChevMood = "welcome" | "thinking" | "responding" | "celebrating";

function ChevMascot({ mood, size = "small" }: { mood: ChevMood; size?: "small" | "large" }) {
  return (
    <span className={`chev-mascot chev-mascot--${size}`} data-mood={mood} aria-hidden="true">
      <Image src="/chev-mascot.webp" alt="" width={size === "large" ? 96 : 52}
        height={size === "large" ? 96 : 52} sizes={size === "large" ? "96px" : "52px"} />
    </span>
  );
}

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
  const [submissionFailed, setSubmissionFailed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusPath, setStatusPath] = useState("");
  const [mood, setMood] = useState<ChevMood>("welcome");
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => {
    if (moodTimer.current) clearTimeout(moodTimer.current);
  }, []);

  function minimizeChat() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  function closeChat() {
    minimizeChat();
    setQuestion("");
    setAnswer(null);
    setShowForm(false);
    setMessage("");
    setNotice("");
    setSubmitted(false);
    setStatusPath("");
  }

  function showResponse() {
    setMood("thinking");
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood("responding"), 450);
  }

  function ask(value: string) {
    if (!value.trim()) return;
    setQuestion(value);
    setAnswer(answerSupportQuestion(value));
    showResponse();
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
    setMood("thinking");
    setNotice("");
    setSubmissionFailed(false);
    try {
      const response = await fetch("/api/support/requests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, name, email, message, website, pagePath: pathname || "/",
          eventUrl: pathname?.startsWith("/events/") ? pathname : undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit your request.");
      setStatusPath(result.statusPath || "");
      setMessage("");
      setShowForm(false);
      setSubmitted(true);
      setMood("celebrating");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to submit your request.");
      setSubmissionFailed(true);
      setMood("responding");
    } finally {
      setBusy(false);
    }
  }

  const isFlyerStudio = pathname?.startsWith("/host/flyer-studio");
  const isEventDetail = /^\/events\/[^/]+\/?$/.test(pathname || "");
  return (
    <div className={`chev-support fixed z-[70] ${isFlyerStudio ? "bottom-3 left-3" : isEventDetail ? "bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-4 sm:bottom-5 sm:right-5" : "bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 sm:bottom-5 sm:right-5"}`}>
      {open && (
        <section id="chev-panel" aria-label="Chev support" onKeyDown={(event) => {
          if (event.key === "Escape") minimizeChat();
        }} className={`chev-panel mb-3 flex w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.75rem] border border-orange-200 bg-white text-zinc-950 shadow-2xl ${isEventDetail ? "h-[min(620px,calc(100dvh-11rem))] sm:h-[min(620px,calc(100dvh-7rem))]" : "h-[min(620px,calc(100dvh-7rem))]"}`}>
          <header className="chev-header flex items-center justify-between gap-3 border-b border-orange-100 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <ChevMascot mood={mood} />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-800">Function Hour support</p>
                <h2 className="text-lg font-black leading-tight text-zinc-950">Chev <span className="ml-1 align-middle text-xs font-semibold text-zinc-700">Here to help</span></h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={minimizeChat} aria-label="Minimize Chev (keep this conversation)" title="Minimize" className="chev-panel-control chev-panel-control--minimize grid h-11 w-11 place-items-center rounded-full border border-orange-300 bg-orange-50 hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"><Minus size={22} strokeWidth={2.5} aria-hidden="true" /></button>
              <button type="button" onClick={closeChat} aria-label="Close Chev (clear this conversation)" title="Close" className="chev-panel-control chev-panel-control--close grid h-11 w-11 place-items-center rounded-full border border-zinc-900 bg-zinc-900 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"><X size={20} strokeWidth={2.5} aria-hidden="true" /></button>
            </div>
          </header>
          <div className="chev-body flex-1 space-y-4 overflow-y-auto p-4">
            {submitted ? (
              <div role="status" className="chev-celebration rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm leading-6">
                <ChevMascot mood="celebrating" size="large" />
                <h3 className="text-xl font-bold text-zinc-950">Thank you! Your request was sent.</h3>
                <p className="mt-3 text-zinc-800">We’ll follow up by email at <strong>{email}</strong>. We aim to respond within 2 business days; timing may vary with request volume.</p>
                {statusPath && <Link href={statusPath} className="mt-4 inline-flex rounded-xl bg-violet-700 px-4 py-2 font-bold text-white hover:bg-violet-800">Track this request →</Link>}
                {statusPath && <p className="mt-2 text-xs text-zinc-700">Save the status link to return later. Keep it private.</p>}
                <button type="button" onClick={() => { setSubmitted(false); setAnswer(null); setQuestion(""); }} className="mt-5 font-bold text-violet-800 underline underline-offset-2">Back to help</button>
              </div>
            ) : <>
            <div className="chev-message flex items-start gap-3" aria-live="polite">
              <ChevMascot mood={mood} />
              <p className="rounded-2xl rounded-tl-sm border border-orange-100 bg-orange-50 p-3 text-sm leading-6 text-zinc-900">Hi! I use Function Hour’s help pages to answer common questions. For account, payment, ticket, refund, or safety issues, you can send a request to Operations.</p>
            </div>
            {mood === "thinking" && !busy && <span className="chev-thinking" role="status"><span className="sr-only">Chev is finding an answer</span><span /><span /><span /></span>}
            {!showForm && (
              <>
                <div className="flex flex-wrap gap-2">
                  {questions.map((item) => <button key={item} type="button" onClick={() => ask(item)} className="rounded-full border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 hover:border-orange-400 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">{item}</button>)}
                </div>
                {answer && <div className="chev-answer rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-6" aria-live="polite">
                  <p className="font-semibold">{question}</p><p className="mt-2">{answer.text}</p>
                  <div className="mt-3 flex flex-wrap gap-2">{answer.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800">{link.label}</Link>)}</div>
                  {answer.requestHelp && <button type="button" onClick={() => { setShowForm(true); setNotice(""); }} className="mt-4 font-semibold text-violet-700 underline">Send a support request</button>}
                </div>}
                <form onSubmit={(event) => { event.preventDefault(); ask(question); }} className="flex gap-2">
                  <label htmlFor="chev-question" className="sr-only">Ask Chev</label>
                  <input id="chev-question" value={question} onChange={(event) => { setQuestion(event.target.value); setAnswer(null); }} maxLength={300} placeholder="Ask a question" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                  <button type="submit" aria-label="Ask" className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-zinc-950 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"><Send size={16} /></button>
                </form>
                <button type="button" onClick={() => { setShowForm(true); setNotice(""); setSubmissionFailed(false); }} className="chev-primary-action w-full rounded-xl px-4 py-3 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">Contact Operations</button>
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
              <div className="flex gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-zinc-300 px-4 py-3 font-semibold">Back</button><button type="submit" disabled={busy} className="chev-primary-action flex-1 rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">{busy ? "Sending…" : "Send request"}</button></div>
            </form>}
            {notice && <div role="status" className="rounded-xl bg-zinc-100 p-3 text-sm font-semibold text-zinc-950">
              <p>{notice}</p>
              {submissionFailed && <a href="mailto:operations@functionhour.com?subject=Function%20Hour%20support" className="mt-2 inline-block font-bold text-violet-800 underline underline-offset-2">Email Operations directly</a>}
            </div>}
            </>}
          </div>
        </section>
      )}
      <button ref={launcherRef} type="button" onClick={() => {
        if (open) minimizeChat();
        else { setMood("welcome"); setOpen(true); }
      }} aria-controls="chev-panel" aria-expanded={open} aria-label={open ? "Minimize Chev" : "Open Chev, Function Hour help"}
        className="chev-launcher ml-auto flex h-14 w-14 items-center justify-center rounded-full border border-orange-200 bg-white text-sm font-bold text-zinc-950 shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 sm:h-16 sm:w-auto sm:gap-2 sm:px-2 sm:pr-5">
        <ChevMascot mood={open ? mood : "welcome"} />
        <span className="hidden sm:inline">Ask Chev</span>
      </button>
    </div>
  );
}
