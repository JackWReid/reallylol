// Content types matching the Astro collection names
export const CONTENT_TYPES = [
  "post",
  "note",
  "photo",
  "highlight",
  "page",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = ["draft", "published"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const MEDIA_KINDS = ["image", "audio", "file"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const BOOK_SHELVES = ["read", "reading", "toread"] as const;
export type BookShelf = (typeof BOOK_SHELVES)[number];

export const FILM_LISTS = ["watched", "towatch"] as const;
export type FilmList = (typeof FILM_LISTS)[number];

// --- API request/response shapes ---

export interface ContentItem {
  id: number;
  type: ContentType;
  slug: string;
  title: string;
  body: string;
  date: string;
  status: ContentStatus;
  meta: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ContentListResponse {
  items: ContentItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateContentRequest {
  type: ContentType;
  slug: string;
  title: string;
  body?: string;
  date?: string;
  status?: ContentStatus;
  meta?: Record<string, unknown>;
  tags?: string[];
}

export interface UpdateContentRequest {
  title?: string;
  body?: string;
  date?: string;
  status?: ContentStatus;
  meta?: Record<string, unknown>;
  tags?: string[];
}

export interface MediaItem {
  id: number;
  r2_key: string;
  kind: MediaKind;
  content_type: string;
  size_bytes: number | null;
  uploaded_at: string;
}

export interface MediaListResponse {
  items: MediaItem[];
  total: number;
  page: number;
  limit: number;
}

export interface BookItem {
  id: number;
  shelf: BookShelf;
  title: string;
  author: string;
  date_updated: string;
  image_url: string | null;
  hardcover_url: string | null;
}

export interface FilmItem {
  id: number;
  list: FilmList;
  name: string;
  year: string | null;
  date_updated: string;
}

export interface LinkItem {
  id: number;
  title: string;
  url: string;
  date: string;
  excerpt: string | null;
  cover: string | null;
  tags: string[];
}

export interface SyncBooksRequest {
  shelf: BookShelf;
  items: Omit<BookItem, "id" | "shelf">[];
}

export interface SyncFilmsRequest {
  list: FilmList;
  items: Omit<FilmItem, "id" | "list">[];
}

export interface SyncLinksRequest {
  items: Omit<LinkItem, "id">[];
}

export interface ApiError {
  error: string;
  message: string;
}

export interface TagCount {
  name: string;
  count: number;
}
