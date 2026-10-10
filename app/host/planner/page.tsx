"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const categories = ["Venue", "Talent", "Production", "Staffing", "Security", "Marketing", "Food & beverage", "Other"];
type Event = { _id: Id<"events">; name: string; price?: number; totalTickets?: number };

export default function HostPlannerPage() {
  const { user, isLoaded } = useUser();
  const events = useQuery(api.events.getMyEvents, user ? {} : "skip");
  const [selected, setSelected] = useState<string>("");
  const event = events?.find((item) => item._id === selected) ?? events?.[0];
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 text-slate-950 sm:px-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-700">Organizer OS / Planning</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Budget Planner</h1><p className="mt-2 text-sm text-slate-700">Build a budget for each event. Save projections and track income and costs as you plan.</p></div>
        <Link href="/host" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:border-violet-500">Back to overview</Link>
      </div>
      {!isLoaded || (user && events === undefined) ? <p role="status">Loading your events…</p> : !user ? <p>Sign in to manage your event budgets.</p> : !events?.length ? <div className="rounded-3xl border border-slate-200 bg-white p-8"><h2 className="text-xl font-semibold">Start with an event</h2><p className="mt-2 text-slate-700">Create an event to give its budget a dedicated home.</p><Link className="mt-5 inline-block rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white" href="/host/create">Create event</Link></div> : <>
        <label htmlFor="budget-event" className="block text-sm font-semibold text-slate-800">Plan for event</label>
        <select id="budget-event" value={event?._id ?? ""} onChange={(e) => setSelected(e.target.value)} className="mt-2 w-full max-w-xl rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-200">
          {events.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
        </select>
        {event && <BudgetEditor key={event._id} event={event} userId={user.id} />}
      </>}
    </main>
  );
}

function BudgetEditor({ event, userId }: { event: Event; userId: string }) {
  const plan = useQuery(api.budget.getPlan, { eventId: event._id });
  const items = useQuery(api.budget.getItems, { eventId: event._id });
  if (plan === undefined || items === undefined) return <p className="mt-8" role="status">Loading budget…</p>;
  return <BudgetWorkspace key={plan?._id ?? "new"} event={event} userId={userId} items={items} plan={plan} />;
}

function BudgetWorkspace({ event, userId, items, plan }: { event: Event; userId: string; items: Doc<"budgetItems">[]; plan: Doc<"budgetPlans"> | null }) {
  const [ticketPrice, setTicketPrice] = useState(String(plan?.ticketPrice ?? event.price ?? 0));
  const [expectedTickets, setExpectedTickets] = useState(String(plan?.expectedTickets ?? event.totalTickets ?? 0));
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const savePlan = useMutation(api.budget.savePlan);
  const addItem = useMutation(api.budget.addItem);
  const deleteItem = useMutation(api.budget.deleteItem);
  const price = Number(ticketPrice) || 0;
  const tickets = Number(expectedTickets) || 0;
  const ticketRevenue = price * tickets;
  const otherIncome = items.filter(i => i.type === "income").reduce((sum, i) => sum + i.amount, 0);
  const expenses = items.filter(i => i.type === "expense").reduce((sum, i) => sum + i.amount, 0);
  const balance = ticketRevenue + otherIncome - expenses;
  const breakEven = price > 0 ? Math.max(0, Math.ceil((expenses - otherIncome) / price)) : null;
  async function saveScenario(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!Number.isFinite(Number(ticketPrice)) || Number(ticketPrice) < 0 || Number(ticketPrice) > 1000000 || !Number.isSafeInteger(Number(expectedTickets)) || Number(expectedTickets) < 0 || Number(expectedTickets) > 1000000 || ticketPrice === "" || expectedTickets === "") { setMessage("Enter a valid nonnegative price and whole ticket count."); return; }
    setBusy(true); setMessage("");
    try { await savePlan({ eventId: event._id, ticketPrice: Number(ticketPrice), expectedTickets: Number(expectedTickets) }); setMessage("Projection saved for this event."); }
    catch { setMessage("Could not save the projection. Please try again."); }
    finally { setBusy(false); }
  }
  async function addLine(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0 || value > 100000000) { setMessage("Enter a line item name and a positive amount."); return; }
    setBusy(true); setMessage("");
    try { await addItem({ eventId: event._id, userId, name: name.trim(), amount: value, type, notes: category }); setName(""); setAmount(""); setMessage("Line item added."); }
    catch { setMessage("Could not add the line item. Please try again."); }
    finally { setBusy(false); }
  }
  async function removeLine(itemId: Id<"budgetItems">) {
    setBusy(true); setMessage("");
    try { await deleteItem({ itemId }); setMessage("Line item removed."); }
    catch { setMessage("Could not remove the line item. Please try again."); }
    finally { setBusy(false); }
  }
  const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-200";
  const card = "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
  return <div className="mt-7 space-y-6">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric title="Projected ticket income" value={money(ticketRevenue)} />
      <Metric title="Other income" value={money(otherIncome)} />
      <Metric title="Planned expenses" value={money(expenses)} />
      <Metric title="Estimated balance" value={money(balance)} highlight />
    </div>
    <p className="text-sm text-slate-700">Planning estimates only. Balance excludes payment processing, taxes, refunds, and other adjustments; it is not your available payout balance.</p>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={card}><h2 className="text-xl font-bold">Ticket projection</h2><p className="mt-1 text-sm text-slate-700">Choose an expected ticket price and turnout.</p>
        <form onSubmit={saveScenario} className="mt-5 space-y-4"><label className="block text-sm font-semibold">Average ticket price ($)<input className={`mt-2 ${input}`} type="number" inputMode="decimal" min="0" max="1000000" step="0.01" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} required /></label><label className="block text-sm font-semibold">Expected tickets sold<input className={`mt-2 ${input}`} type="number" inputMode="numeric" min="0" max="1000000" step="1" value={expectedTickets} onChange={e => setExpectedTickets(e.target.value)} required /></label><button disabled={busy} type="submit" className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50">Save projection</button></form>
        <div className="mt-6 rounded-2xl bg-violet-50 p-4"><p className="text-sm font-semibold text-violet-900">Break even on planned costs</p><p className="mt-1 text-2xl font-bold text-violet-950">{breakEven === null ? "Set a ticket price" : `${breakEven.toLocaleString()} tickets`}</p></div>
      </section>
      <section className={card}><h2 className="text-xl font-bold">Add a budget item</h2><p className="mt-1 text-sm text-slate-700">Track costs and income separate from ticket sales.</p>
        <form onSubmit={addLine} className="mt-5 space-y-4"><label className="block text-sm font-semibold">Type<select className={`mt-2 ${input}`} value={type} onChange={e => setType(e.target.value as "expense" | "income")}><option value="expense">Expense</option><option value="income">Other income</option></select></label><label className="block text-sm font-semibold">Name<input className={`mt-2 ${input}`} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Venue rental" required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">Category<select className={`mt-2 ${input}`} value={category} onChange={e => setCategory(e.target.value)}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label className="block text-sm font-semibold">Amount ($)<input className={`mt-2 ${input}`} type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label></div><button disabled={busy} type="submit" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">Add item</button></form>
      </section>
    </div>
    <section className={card}><div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-xl font-bold">Budget breakdown</h2><span className="text-sm text-slate-700">{items.length} saved items</span></div>{items.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-700">No line items yet. Add your first cost or source of income above.</p> : <ul className="mt-5 divide-y divide-slate-200">{items.map(item => <li key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-slate-950">{item.name}</p><p className="text-sm text-slate-700">{item.type === "income" ? "Income" : "Expense"}{item.notes ? ` · ${item.notes}` : ""}</p></div><div className="flex items-center gap-4"><span className={`font-bold ${item.type === "income" ? "text-emerald-800" : "text-slate-950"}`}>{item.type === "income" ? "+" : "−"}{money(item.amount)}</span><button type="button" disabled={busy} onClick={() => removeLine(item._id)} aria-label={`Remove ${item.name}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50">Remove</button></div></li>)}</ul>}</section>
    <p role="status" aria-live="polite" className="min-h-6 text-sm font-semibold text-violet-900">{message}</p>
  </div>;
}
function Metric({ title, value, highlight = false }: { title: string; value: string; highlight?: boolean }) { return <div className={`rounded-2xl border p-5 ${highlight ? "border-violet-700 bg-violet-900 text-white" : "border-slate-200 bg-white text-slate-950"}`}><p className={`text-sm font-semibold ${highlight ? "text-violet-100" : "text-slate-700"}`}>{title}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></div>; }
