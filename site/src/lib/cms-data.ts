/**
 * Fetch data from the CMS API at build time.
 * Falls back to local JSON files if CMS is unavailable.
 */

const CMS_API_URL = import.meta.env.CMS_API_URL ?? "http://localhost:8788";
const CMS_API_KEY = import.meta.env.CMS_API_KEY ?? "dev-test-key";

async function cmsGet<T>(path: string): Promise<T> {
  const url = `${CMS_API_URL}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CMS_API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`CMS API error: ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

interface BookRow {
  title: string;
  author: string;
  date_updated: string;
  image_url: string | null;
  hardcover_url: string | null;
}

interface FilmRow {
  name: string;
  year: string | null;
  date_updated: string;
}

interface LinkRow {
  title: string;
  url: string;
  date: string;
  excerpt: string | null;
  cover: string | null;
  tags: string[];
}

interface RandomPhoto {
  path: string;
}

export async function getBooks(shelf: string): Promise<BookRow[]> {
  return cmsGet<BookRow[]>(`/api/data/books?shelf=${shelf}`);
}

export async function getFilms(list: string): Promise<FilmRow[]> {
  return cmsGet<FilmRow[]>(`/api/data/films?list=${list}`);
}

export async function getLinks(): Promise<LinkRow[]> {
  return cmsGet<LinkRow[]>("/api/data/links");
}

export async function getRandomPhotos(): Promise<RandomPhoto[]> {
  return cmsGet<RandomPhoto[]>("/api/data/random-photos");
}

export async function getConfig(): Promise<Record<string, unknown>> {
  return cmsGet<Record<string, unknown>>("/api/data/config");
}
