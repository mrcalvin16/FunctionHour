import OrderRecoveryDesk from "@/components/admin/OrderRecoveryDesk";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
    <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Operations · ticketing</p>
    <h1 className="mt-2 text-3xl font-bold text-zinc-950">Orders & ticket recovery</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-700">Compare completed Stripe ticket checkouts with Function Hour orders and passes. Recover only after verifying the payment and buyer. The recovery action is logged and never issues a second set of passes for an already fulfilled order.</p>
    <OrderRecoveryDesk />
  </main>;
}
