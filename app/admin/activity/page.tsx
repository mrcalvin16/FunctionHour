import UserActivityBoard from "@/components/admin/UserActivityBoard";
export default function ActivityPage() {
  return <main className="mx-auto max-w-7xl space-y-6 px-5 py-10 sm:px-8"><div><h1 className="text-3xl font-bold text-zinc-900">Users & activity</h1><p className="mt-2 text-zinc-700">Recent Function Hour registrations, onboarding progress, and calls to action.</p></div><UserActivityBoard /></main>;
}
