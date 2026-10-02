"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function EventImage({
  storageId,
  imageUrl: directImageUrl,
  alt = "Event image",
  className = "h-full w-full object-cover",
  fallbackClassName = "flex h-full w-full items-center justify-center bg-white/10 text-sm text-white/40",
}: {
  storageId?: Id<"_storage">;
  imageUrl?: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const storedImageUrl = useQuery(
    api.events.getImageUrl,
    !directImageUrl && storageId ? { storageId } : "skip"
  );
  const imageUrl = directImageUrl || storedImageUrl;

  if (!directImageUrl && !storageId) {
    return <div className={fallbackClassName}>No Image</div>;
  }

  if (imageUrl === undefined) {
    return <div className={fallbackClassName}>Loading image...</div>;
  }

  if (!imageUrl) {
    return <div className={fallbackClassName}>Image unavailable</div>;
  }

  return <img src={imageUrl} alt={alt} className={className} />;
}
