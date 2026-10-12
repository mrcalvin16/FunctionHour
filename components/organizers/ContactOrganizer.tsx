"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Mail, X } from "lucide-react";

type Props = {
  organizerUserId: string;
  organizerName: string;
  eventId?: string;
  appearance?: "light" | "dark";
};

export default function ContactOrganizer({ organizerUserId, organizerName, eventId, appearance = "light" }: Props) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"ticket" | "event" | "other">("event");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select:not(:disabled), textarea:not(:disabled), input:not(:disabled)',
        );
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true); setStatus("");
    try {
      const response = await fetch("/api/organizers/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizerUserId, eventId, reason, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Message could not be sent.");
      setMessage("");
      setSent(true);
      setStatus("Message sent. The organizer can reply to your account email.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Message could not be sent.");
    } finally { setSending(false); }
  }

  return <>
    <button ref={triggerRef} type="button" onClick={() => {
      if (!isSignedIn) {
        const destination = eventId ? `/events/${eventId}` : `/organizers/${organizerUserId}`;
        router.push(`/sign-in?redirect_url=${encodeURIComponent(destination)}`);
      } else { setStatus(""); setSent(false); setOpen(true); }
    }} disabled={!isLoaded || user?.id === organizerUserId} className={appearance === "dark"
      ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
      : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-violet-50 disabled:opacity-50"}>
      <Mail size={17} aria-hidden="true" />Contact organizer
    </button>
    {open && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="contact-organizer-title" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 text-zinc-950 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-violet-800">Function Hour</p><h2 id="contact-organizer-title" className="mt-2 text-2xl font-black">Contact {organizerName}</h2><p className="mt-2 text-sm text-zinc-700">Your message goes directly to the organizer. They can reply to your account email.</p></div><button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close contact form" className="rounded-full border border-zinc-300 p-2"><X size={20} /></button></div>
        {sent ? <div className="mt-6 rounded-2xl bg-violet-50 p-5"><p role="status" className="font-bold text-violet-950">{status}</p><button type="button" onClick={() => setOpen(false)} className="mt-4 rounded-xl bg-violet-700 px-5 py-3 font-bold text-white">Done</button></div> : <form onSubmit={send} className="mt-6 space-y-4">
          <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-800"><strong>From:</strong> {user?.fullName || "Attendee"} · {user?.primaryEmailAddress?.emailAddress}</div>
          <label className="block text-sm font-bold">Contact reason<select value={reason} onChange={e => setReason(e.target.value as typeof reason)} className="mt-2 w-full rounded-xl border border-zinc-400 bg-white p-3 text-zinc-950"><option value="ticket">Question about my ticket</option><option value="event">Question about the event</option><option value="other">Other</option></select></label>
          <label className="block text-sm font-bold">Message<textarea required minLength={10} maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} placeholder="How can the organizer help?" className="mt-2 min-h-36 w-full rounded-xl border border-zinc-400 bg-white p-3 text-zinc-950 placeholder:text-zinc-600" /></label>
          <p className="text-xs text-zinc-700">For a payment dispute or safety concern, contact Function Hour support. Do not include payment card details.</p>
          <button type="submit" disabled={sending} className="min-h-12 w-full rounded-xl bg-violet-700 px-5 py-3 font-bold text-white hover:bg-violet-800 disabled:opacity-60">{sending ? "Sending…" : "Send message"}</button>
          {status && <p role="status" aria-live="polite" className="text-sm font-semibold text-zinc-900">{status}</p>}
        </form>}
      </section>
    </div>}
  </>;
}
