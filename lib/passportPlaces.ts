export function placeLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePlace(value: string): string {
  return placeLabel(value).normalize("NFKC").toLocaleLowerCase("en-US");
}
