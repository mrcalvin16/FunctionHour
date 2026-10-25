export function brandedMediaUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (
      parsed.hostname === "colorless-aardvark-337.convex.cloud" &&
      parsed.pathname.startsWith("/api/storage/") &&
      parsed.pathname.slice("/api/storage/".length).length > 0 &&
      !parsed.pathname.slice("/api/storage/".length).includes("/")
    ) {
      return `https://functionhour.com/media/${parsed.pathname.split("/").pop()}`;
    }
  } catch {
    return url;
  }

  return url;
}
