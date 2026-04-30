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
