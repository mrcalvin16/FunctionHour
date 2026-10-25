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
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { isLoaded: userLoaded, user: clerkUser } = useUser();
  const identityReady = isLoaded && userLoaded &&
    (!isSignedIn || Boolean(userId && clerkUser?.id === userId));
  const access = useQuery(
    api.users.getOrganizerAccess,
    identityReady && isSignedIn && userId ? {} : "skip",
  );
  const isResolving = !identityReady || (isSignedIn && access === undefined);

  // Never show an account-specific role or link until the active Clerk
  // identity and the Convex access result have both resolved.
  if (isResolving) {
    return <span aria-label="Loading account navigation" className={className}>{attendeeLabel}</span>;
  }

  const isAdmin = Boolean(isSignedIn && clerkUser?.id === userId &&
    clerkUser?.emailAddresses.some((email) =>
      email.verification?.status === "verified" &&
      email.emailAddress.trim().toLowerCase() === "operations@functionhour.com"
    ));
  const canAccess = access?.canAccessOrganizerTools === true;
  const href = !isSignedIn
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
