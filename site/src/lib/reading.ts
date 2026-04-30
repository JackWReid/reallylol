export interface BookRow {
  title: string;
  author: string;
  date_updated: string;
  image_url?: string;
  hardcover_url?: string;
}

export function hasCover(book: BookRow): boolean {
  return typeof book.image_url === "string" && book.image_url.length > 0;
}

export function formatSince(dateUpdated: string): string {
  const d = new Date(dateUpdated);
  if (Number.isNaN(d.getTime())) return "";
  const formatted = d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `SINCE ${formatted.toUpperCase()}`;
}
