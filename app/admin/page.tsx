import Link from "next/link";
import OrderRecoveryDesk from "@/components/admin/OrderRecoveryDesk";

export default function AdminPage() {
  const sections = [
    {
      title: "Orders & ticket recovery",
      description: "Find paid checkouts, inspect fulfillment, and recover missing orders or passes.",
      href: "/admin/orders",
      action: "Open order desk",
    },
    {
      title: "Finance and payouts",
      description: "Review payout history, Stripe transfers, and organizer proceeds. Finance holds the approval queue.",
      href: "/admin/payouts",
      action: "Open payout ledger",
    },
    {
      title: "Organizer verification",
      description: "Review pending blue check requests and approve organizer profiles.",
      href: "/admin/organizer-verification",
      action: "Review requests",
    },
    {
      title: "Support requests",
      description: "Review visitor ticket, refund, payment, account, and event reports sent through Chev.",
      href: "/admin/support",
      action: "Open support requests",
    },
    {
      title: "System health",
      description: "Check Stripe, Convex, fulfillment, support intake, and payout queues for operational issues.",
      href: "/admin/health",
      action: "Run health checks",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Operations</p>
      <h1 className="mt-2 text-3xl font-bold text-zinc-950">Admin console</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-700">
        Choose an operations area. Finance and verification use live data from their respective services.
      </p>
      <OrderRecoveryDesk compact />
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <section key={section.href} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">{section.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-zinc-700">{section.description}</p>
            <Link href={section.href} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800">
              {section.action}
            </Link>
          </section>
        ))}
      </div>
    </main>
  );
}
