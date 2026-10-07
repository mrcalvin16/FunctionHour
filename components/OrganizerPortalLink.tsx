"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
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
  const { user: clerkUser } = useUser();
  // Match the verified-email rule enforced by the admin portal on the server.
  const isAdmin = isSignedIn && clerkUser?.emailAddresses.some((email) =>
    email.verification?.status === "verified" &&
    email.emailAddress.trim().toLowerCase() === "operations@functionhour.com",
  );
  const user = useQuery(api.users.getCurrentUser, isSignedIn ? {} : "skip");
  const ownedEvents = useQuery(api.events.getMyEvents, isSignedIn ? {} : "skip");
  const canAccess = user?.isOrganizer === true || Boolean(ownedEvents?.length);
  const href = !isLoaded
    ? "/onboarding"
    : !isSignedIn
      ? "/sign-up?redirect_url=%2Fhost%2Fprofile"
      : isAdmin
        ? "/admin"
        : canAccess
        ? organizerHref
        : "/host/profile";

  return (
    <Link data-cta={isAdmin ? "admin_portal" : isSignedIn && canAccess ? undefined : "create_event"} prefetch={false} href={href} className={className}>
      {isAdmin ? "Admin" : isSignedIn && canAccess ? organizerLabel : attendeeLabel}
    </Link>
  );
}
