"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function FollowingNavLink({ className, onClick }: { className: string; onClick?: () => void }) {
  const unread = useQuery(api.discoveryFollows.getUnreadCount);
  return <Link href="/following" onClick={onClick} className={className}>
    Following {unread ? <span aria-label={`${unread} new events`} className="ml-1 rounded-full bg-violet-700 px-1.5 py-0.5 text-[10px] font-black text-white">{unread > 99 ? "99+" : unread}</span> : null}
  </Link>;
}
