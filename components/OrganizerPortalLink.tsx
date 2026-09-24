"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function OrganizerPortalLink({
  className,
  organizerLabel = "Organizer OS",
  attendeeLabel = "Create Event",
  organizerHref = "/host",
}: {
  className?: string;
  organizerLabel?: string;
  attendeeLabel?: string;
  organizerHref?: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useQuery(api.users.getCurrentUser, isSignedIn ? {} : "skip");
  const ownedEvents = useQuery(api.events.getMyEvents, isSignedIn ? {} : "skip");
  const canAccess = user?.isOrganizer === true || Boolean(ownedEvents?.length);
  const href = !isLoaded
    ? "/onboarding"
    : !isSignedIn
      ? "/sign-up?redirect_url=%2Fhost%2Fprofile"
      : canAccess
        ? organizerHref
        : "/host/profile";

  return (
    <Link prefetch={false} href={href} className={className}>
      {isSignedIn && canAccess ? organizerLabel : attendeeLabel}
    </Link>
  );
}
