"use client";

import { use } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import EventCommandCenter from "@/components/host/events/command-center/EventCommandCenter";

export default function HostEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const eventId = id as Id<"events">;
  const { isLoaded, isSignedIn, user } = useUser();
  const event = useQuery(api.events.getById, {
    eventId,
  });
  const access = useQuery(
    api.eventAccess.getMyEventAccess,
    isLoaded && isSignedIn && event
      ? { eventId }
      : "skip"
  );

  if (
    !isLoaded ||
    event === undefined ||
    (isSignedIn && event && access === undefined)
  ) {
    return <CommandCenterLoading />;
  }

  if (!isSignedIn) {
    return (
      <CommandCenterState
        title="Sign in required"
        detail="Sign in to open this event’s organizer workspace."
      />
    );
  }

  if (!event) {
    return (
      <CommandCenterState
        title="Event not found"
        detail="This event may have been removed or the link is incorrect."
      />
    );
  }

  if (!access || !access.role) {
    return (
      <CommandCenterState
        title="Access unavailable"
        detail={`You are signed in as ${user?.primaryEmailAddress?.emailAddress || "an account without a primary email"}. Ask the event organizer to invite this exact email address, then sign out and back in if the invitation was just added.`}
      />
    );
  }

  return (
    <EventCommandCenter
      event={event}
      role={access.role}
      capabilities={access.capabilities}
    >
      {children}
    </EventCommandCenter>
  );
}

function CommandCenterLoading() {
  return (
    <div className="animate-pulse px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-5 w-32 rounded-full bg-white/[0.05]" />
      <div className="mt-6 h-10 max-w-xl rounded-xl bg-white/[0.06]" />
      <div className="mt-4 h-4 max-w-md rounded-full bg-white/[0.04]" />
      <div className="mt-8 h-14 rounded-2xl bg-white/[0.04]" />
      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 rounded-3xl bg-white/[0.04]"
          />
        ))}
      </div>
    </div>
  );
}

function CommandCenterState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-[1.75rem] border border-white/[0.09] bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/30">
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          {detail}
        </p>
        <Link
          href="/host"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-xs font-black text-black"
        >
          Back to my events
        </Link>
      </div>
    </div>
  );
}
