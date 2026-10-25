"use client";

import { useEffect, useState } from "react";
import { brandedMediaUrl } from "@/lib/brandedMediaUrl";
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
  const src = brandedMediaUrl(imageUrl) ?? imageUrl;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

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

  if (!src || failedSrc === src) {
    return (
      <div className="flex h-56 items-center justify-center bg-zinc-900 text-zinc-500">
        Image unavailable
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/* Public flyers are already served by our branded /media rewrite.
          Render them directly rather than routing the proxy through Next's
          image optimizer, which can fail while the event detail image works. */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={`block h-full w-full object-cover ${className}`}
      />
    </div>
  );
}
