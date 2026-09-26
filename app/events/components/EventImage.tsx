"use client";

import Image from "next/image";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type EventImageProps = {
  storageId?: Id<"_storage">;
  className?: string;
  alt?: string;
};

export default function EventImage({ storageId, className = "h-56", alt = "Event image" }: EventImageProps) {
  const imageUrl = useQuery(
    api.events.getImageUrl,
    storageId ? { storageId } : "skip"
  );

  if (!storageId) {
    return (
      <div className={`flex ${className} items-center justify-center bg-zinc-900 text-zinc-300`}>
        No Image
      </div>
    );
  }

  if (imageUrl === undefined) {
    return (
      <div className={`flex ${className} items-center justify-center bg-zinc-900 text-zinc-300`}>
        Loading image...
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`flex ${className} items-center justify-center bg-zinc-900 text-zinc-300`}>
        Image unavailable
      </div>
    );
  }

  return (
    <div className={`relative ${className} w-full overflow-hidden`}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover transition duration-300 group-hover:scale-105"
      />
    </div>
  );
}
