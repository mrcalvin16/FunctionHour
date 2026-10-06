import { notFound } from "next/navigation";
import Link from "next/link";
import { hasFunctionHourAdminAccess } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasFunctionHourAdminAccess())) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <nav aria-label="Operations" className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 text-sm sm:px-8">
          <Link href="/admin" className="font-bold text-violet-700">Function Hour Operations</Link>
          <Link href="/admin/orders" className="font-medium hover:text-violet-700">Orders</Link>
          <Link href="/admin/finance" className="font-medium hover:text-violet-700">Finance</Link>
          <Link href="/admin/payouts" className="font-medium hover:text-violet-700">Payout ledger</Link>
          <Link href="/admin/organizer-verification" className="font-medium hover:text-violet-700">Organizer verification</Link>
          <Link href="/admin/support" className="font-medium hover:text-violet-700">Support requests</Link>
          <Link href="/admin/activity" className="font-medium hover:text-violet-700">Users & activity</Link>
          <Link href="/admin/health" className="font-medium hover:text-violet-700">System health</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
