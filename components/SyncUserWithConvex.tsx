"use client";

import { api } from "@/convex/_generated/api";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";

export default function SyncUserWithConvex() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const updateUser = useMutation(api.users.updateUser);
  const lastSynced = useRef<string | null>(null);
  const name = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || user?.id !== userId) {
      lastSynced.current = null;
      return;
    }
    // Clerk may replace the user object on refresh. Only sync when the
    // active identity or profile fields actually change.
    const key = JSON.stringify([userId, name, email]);
    if (lastSynced.current === key) return;
    lastSynced.current = key;

    void updateUser({ name, email }).catch((error) => {
      if (lastSynced.current === key) lastSynced.current = null;
      console.error("Error syncing user:", error);
    });
  }, [isLoaded, isSignedIn, userId, user?.id, name, email, updateUser]);

  return null;
}
