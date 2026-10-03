"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type EventImageProps = {
  storageId?: Id<"_storage">;
  imageUrl?: string | null;
  className?: string;
  alt?: string;
};

export default function EventImage({
  storageId,
  imageUrl: directImageUrl,
  className = "h-full w-full object-cover",
  alt = "Event image",
}: EventImageProps) {
  const storedImageUrl = useQuery(
    api.events.getImageUrl,
    !directImageUrl && storageId ? { storageId } : "skip"
  );
  const imageUrl = directImageUrl || storedImageUrl;

  if (!directImageUrl && !storageId) {
    return (
      <div className="flex h-56 items-center justify-center bg-zinc-900 text-zinc-500">
        No Image
      </div>
    );
  }

  if (imageUrl === undefined) {
    return (
      <div className="flex h-56 items-center justify-center bg-zinc-900 text-zinc-500">
        Loading image...
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="flex h-56 items-center justify-center bg-zinc-900 text-zinc-500">
        Image unavailable
      </div>
    );
  }

  return (
    <div className="relative h-56 w-full overflow-hidden">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className={className}
      />
    </div>
  );
}
