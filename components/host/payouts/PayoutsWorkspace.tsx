"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, Clock3, DollarSign, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";

type ConnectStatus = "loading" | "not_connected" | "incomplete" | "pending" | "active" | "error";
type StatusResponse = { status: Exclude<ConnectStatus, "loading" | "error">; accountId: string | null; chargesEnabled?: boolean; payoutsEnabled?: boolean; detailsSubmitted?: boolean; requirementsDue?: number; error?: string };
type PayoutRequestStatus = { connected: boolean; accountReady: boolean; earnedAmount: number; transferredAmount: number; requestableAmount: number; pendingRequest: { amount: number; createdAt: number } | null };

export default function PayoutsWorkspace() {
  const analytics = useQuery(api.analytics.getOrganizerAnalytics, {});
  const [connect, setConnect] = useState<StatusResponse | null>(null);
  const [status, setStatus] = useState<ConnectStatus>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [requestStatus, setRequestStatus] = useState<PayoutRequestStatus | null>(null);

  const loadStatus = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await fetch("/api/stripe/connect", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load payout status.");
      setConnect(data);
      setStatus(data.status);
      const payoutResponse = await fetch("/api/stripe/payout-request", { cache: "no-store" });
      const payoutData = await payoutResponse.json();
      if (!payoutResponse.ok) throw new Error(payoutData.error || "Unable to load payout request status.");
      setRequestStatus(payoutData);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to load payout status.");
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  async function openStripe(action: "onboard" | "dashboard") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/stripe/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Unable to open Stripe.");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open Stripe.");
      setBusy(false);
    }
  }

  async function requestFunds() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/stripe/payout-request", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to request funds.");
      setMessage(data.message || "Your payout request was completed.");
      await loadStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to request funds.");
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  const trackedRevenue = analytics?.totalRevenue ?? 0;
  const reconciliation = analytics?.reconciliation;
  const trackedGross = reconciliation?.grossAmount ?? trackedRevenue;
  const organizerNet = reconciliation?.netAmount ?? trackedRevenue;
  const functionHourFee = reconciliation?.platformFeeAmount ?? Math.max(0, trackedGross - organizerNet);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Revenue operations</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Payouts</h2><p className="mt-2 text-sm text-zinc-500">Connect your bank through Stripe and track settlement readiness.</p></div>
        <button type="button" onClick={() => void loadStatus()} disabled={status === "loading"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-xs font-black hover:bg-white/[0.08] disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} /> Refresh status</button>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Tracked ticket revenue" value={analytics === undefined ? "—" : currency(trackedRevenue)} icon={DollarSign} accent="text-violet-400" />
        <Metric label="Payout routing" value={status === "active" ? "Ready" : "Not ready"} icon={ArrowUpRight} accent={status === "active" ? "text-emerald-400" : "text-orange-400"} />
        <Metric label="Stripe payout status" value={statusLabel(status)} icon={Building2} accent={status === "active" ? "text-emerald-400" : "text-zinc-500"} />
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Funds ready to request" value={requestStatus ? currency(requestStatus.requestableAmount) : "—"} icon={Clock3} accent="text-emerald-400" />
        <Metric label="Gross sales" value={analytics === undefined ? "—" : currency(trackedGross)} icon={DollarSign} accent="text-violet-400" />
        <Metric label="Function Hour fee" value={analytics === undefined ? "—" : currency(functionHourFee)} icon={ArrowUpRight} accent="text-orange-400" />
        <Metric label="Organizer net" value={analytics === undefined ? "—" : currency(organizerNet)} icon={Building2} accent="text-emerald-400" />
        <Metric label="Transferred to Stripe" value={requestStatus ? currency(requestStatus.transferredAmount) : "—"} icon={ArrowUpRight} accent="text-emerald-400" />
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-400">Stripe Connect</p><h3 className="mt-2 text-xl font-black">Payout account</h3></div><StatusIcon status={status} /></div>
          <div className="mt-6 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
            <p className="text-sm font-black">{statusHeadline(status)}</p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{statusDescription(status, connect?.requirementsDue ?? 0)}</p>
            {connect?.accountId ? <p className="mt-3 font-mono text-[10px] text-zinc-700">Account · {connect.accountId}</p> : null}
          </div>
          {message ? <div className="mt-4 flex gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300"><AlertTriangle className="h-4 w-4 shrink-0" />{message}</div> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {status !== "active" ? <button type="button" onClick={() => void openStripe("onboard")} disabled={busy || status === "loading"} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-orange-500 px-5 text-xs font-black hover:brightness-110 disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{status === "not_connected" ? "Set up payouts" : "Continue Stripe setup"}</button> : <button type="button" onClick={() => void openStripe("dashboard")} disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-xs font-black text-black hover:bg-zinc-200 disabled:opacity-40"><ArrowUpRight className="h-4 w-4" /> Open Stripe dashboard</button>}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-orange-400/15 bg-orange-400/[0.055] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">Settlement</p><h3 className="mt-2 text-lg font-black">Ticket sales stay open.</h3><p className="mt-3 text-xs leading-6 text-zinc-500">Buyers can pay through Stripe while Function Hour tracks the organizer’s net ticket funds. Connect a payout account when you are ready to request a transfer. Your tax responsibilities remain yours.</p>
          <div className="mt-5 space-y-3 text-xs"><Guardrail done={Boolean(connect?.accountId)} text="Stripe account connected" /><Guardrail done={status === "active"} text="Stripe account ready to receive transfers" /><Guardrail done={Boolean(requestStatus?.transferredAmount)} text="Previous transfers recorded" /></div>
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm">
            <p className="font-bold">Eligible funds</p>
            <p className="mt-1 text-2xl font-black">{requestStatus ? currency(requestStatus.requestableAmount) : "—"}</p>
            {requestStatus?.pendingRequest ? <p className="mt-1 text-xs text-orange-300">A {currency(requestStatus.pendingRequest.amount)} request is still processing.</p> : <p className="mt-1 text-xs text-zinc-500">Transfers are limited to recorded net ticket sales and Stripe funds available now.</p>}
            <button type="button" onClick={() => void requestFunds()} disabled={busy || status !== "active" || (!requestStatus?.pendingRequest && !(requestStatus?.requestableAmount ?? 0))} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              {requestStatus?.pendingRequest ? "Retry fund transfer" : "Request available funds"}
            </button>
            <p className="mt-2 text-[10px] leading-4 text-zinc-500">Funds move to your Stripe account. Your bank receives them according to the payout schedule in Stripe.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon, accent }: { label: string; value: string; icon: typeof DollarSign; accent: string }) { return <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-zinc-500">{label}</p><Icon className={`h-4 w-4 ${accent}`} /></div><p className="mt-3 text-2xl font-black">{value}</p></div>; }
function Guardrail({ done, text }: { done: boolean; text: string }) { return <div className="flex items-center gap-2"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${done ? "bg-emerald-400/15 text-emerald-400" : "bg-white/[0.05] text-zinc-700"}`}>{done ? "✓" : "·"}</span><span className={done ? "text-zinc-300" : "text-zinc-600"}>{text}</span></div>; }
function StatusIcon({ status }: { status: ConnectStatus }) { if (status === "loading") return <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />; if (status === "active") return <CheckCircle2 className="h-5 w-5 text-emerald-400" />; if (status === "pending") return <Clock3 className="h-5 w-5 text-orange-400" />; return <AlertTriangle className="h-5 w-5 text-zinc-600" />; }
function statusLabel(status: ConnectStatus) { return ({ loading: "Checking", not_connected: "Not connected", incomplete: "Setup incomplete", pending: "Under review", active: "Ready", error: "Unavailable" })[status]; }
function statusHeadline(status: ConnectStatus) { return ({ loading: "Checking Stripe status", not_connected: "Connect a payout account", incomplete: "Finish your payout setup", pending: "Stripe verification is pending", active: "Your payout account is ready", error: "Payout status unavailable" })[status]; }
function statusDescription(status: ConnectStatus, due: number) { return ({ loading: "Retrieving the latest account requirements from Stripe.", not_connected: "Stripe securely collects your business, identity, tax, and bank information.", incomplete: `${due || "Some"} Stripe requirement${due === 1 ? " is" : "s are"} still due.`, pending: "Your submitted information is being reviewed. Refresh this page for updates.", active: "Stripe has enabled transfers and payouts for this connected account.", error: "Try refreshing. No payout settings were changed." })[status]; }
function currency(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value); }
