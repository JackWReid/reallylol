import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "../lib/types";
import { BOOK_SHELVES, FILM_LISTS } from "../../../shared/types";

const app = new Hono<{ Bindings: Env }>();

// D1 has strict limits on SQL statement size; keep batches small
const BATCH_SIZE = 10;

// POST /api/sync/books — bulk replace books for a shelf
app.post("/books", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const body = await c.req.json();

  const { shelf, items } = body;
  if (!shelf || !BOOK_SHELVES.includes(shelf)) {
    return c.json(
      { error: "validation", message: `Invalid shelf. Must be one of: ${BOOK_SHELVES.join(", ")}` },
      400,
    );
  }
  if (!Array.isArray(items)) {
    return c.json({ error: "validation", message: "items must be an array" }, 400);
  }

  // Delete existing for this shelf
  await db.delete(schema.books).where(eq(schema.books.shelf, shelf));

  // Deduplicate and insert in batches
  const seen = new Set<string>();
  const rows = items
    .map((item: Record<string, unknown>) => ({
      shelf,
      title: String(item.title ?? ""),
      author: String(item.author ?? ""),
      date_updated: String(item.date_updated ?? ""),
      image_url: item.image_url ? String(item.image_url) : null,
      hardcover_url: item.hardcover_url ? String(item.hardcover_url) : null,
    }))
    .filter((r) => {
      const key = `${r.title}|${r.author}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(schema.books).values(rows.slice(i, i + BATCH_SIZE));
  }

  return c.json({ ok: true, shelf, count: rows.length });
});

// POST /api/sync/films — bulk replace films for a list
app.post("/films", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const body = await c.req.json();

  const { list, items } = body;
  if (!list || !FILM_LISTS.includes(list)) {
    return c.json(
      { error: "validation", message: `Invalid list. Must be one of: ${FILM_LISTS.join(", ")}` },
      400,
    );
  }
  if (!Array.isArray(items)) {
    return c.json({ error: "validation", message: "items must be an array" }, 400);
  }

  // Delete existing for this list
  await db.delete(schema.films).where(eq(schema.films.list, list));

  // Deduplicate and insert in batches
  const seen = new Set<string>();
  const rows = items
    .map((item: Record<string, unknown>) => ({
      list,
      name: String(item.name ?? ""),
      year: item.year ? String(item.year) : null,
      date_updated: String(item.date_updated ?? ""),
    }))
    .filter((r) => {
      const key = `${r.name}|${r.year}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(schema.films).values(rows.slice(i, i + BATCH_SIZE));
  }

  return c.json({ ok: true, list, count: rows.length });
});

// POST /api/sync/links — bulk replace all saved links
app.post("/links", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const body = await c.req.json();

  const { items } = body;
  if (!Array.isArray(items)) {
    return c.json({ error: "validation", message: "items must be an array" }, 400);
  }

  // Delete all existing links
  await db.delete(schema.links);

  // Insert new in batches
  const rows = items.map((item: Record<string, unknown>) => ({
    title: String(item.title ?? ""),
    url: String(item.url ?? ""),
    date: String(item.date ?? ""),
    excerpt: item.excerpt ? String(item.excerpt) : null,
    cover: item.cover ? String(item.cover) : null,
    tags: JSON.stringify(item.tags ?? []),
  }));
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(schema.links).values(rows.slice(i, i + BATCH_SIZE));
  }

  return c.json({ ok: true, count: rows.length });
});

// ---- Server-side sync triggers (fetch from external APIs) ----

const HARDCOVER_API = "https://api.hardcover.app/v1/graphql";
const SHELF_STATUS_IDS: Record<string, number> = {
  toread: 1,
  reading: 2,
  read: 3,
};

// POST /api/sync/books/fetch — fetch books from Hardcover and sync into DB
app.post("/books/fetch", async (c) => {
  const apiKey = c.env.HARDCOVER_API_KEY;
  if (!apiKey) {
    return c.json({ error: "not_configured", message: "HARDCOVER_API_KEY secret is not set" }, 503);
  }

  const db = drizzle(c.env.DB, { schema });
  const results: Record<string, number> = {};

  for (const [shelf, statusId] of Object.entries(SHELF_STATUS_IDS)) {
    const query = `
      query GetUserBooks($statusId: Int!) {
        me {
          user_books(where: {status_id: {_eq: $statusId}}, order_by: {date_added: desc}) {
            date_added
            book {
              title
              slug
              contributions { author { name } }
              image { url }
            }
          }
        }
      }
    `;

    const res = await fetch(HARDCOVER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.replace(/^Bearer\s+/i, "")}`,
      },
      body: JSON.stringify({ query, variables: { statusId } }),
    });

    if (!res.ok) {
      return c.json({ error: "hardcover_error", message: `Hardcover API returned ${res.status}` }, 502);
    }

    const json = await res.json() as any;
    if (json.errors) {
      return c.json({ error: "hardcover_error", message: json.errors[0]?.message ?? "GraphQL error" }, 502);
    }

    const userBooks = json.data?.me?.[0]?.user_books ?? [];
    const items = userBooks.map((ub: any) => ({
      title: ub.book.title,
      author: (ub.book.contributions ?? []).map((c: any) => c.author.name).join(", "),
      date_updated: (ub.date_added ?? "").slice(0, 10),
      image_url: ub.book.image?.url ?? null,
      hardcover_url: ub.book.slug ? `https://hardcover.app/books/${ub.book.slug}` : null,
    }));

    // Delete + insert for this shelf
    await db.delete(schema.books).where(eq(schema.books.shelf, shelf));
    const seen = new Set<string>();
    const rows = items.filter((r: any) => {
      const key = `${r.title}|${r.author}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((r: any) => ({ shelf, ...r }));

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await db.insert(schema.books).values(rows.slice(i, i + BATCH_SIZE));
    }
    results[shelf] = rows.length;
  }

  // Store sync timestamp
  await db.insert(schema.config).values({
    key: "last_books_sync",
    value: JSON.stringify(new Date().toISOString()),
  }).onConflictDoUpdate({
    target: schema.config.key,
    set: { value: JSON.stringify(new Date().toISOString()) },
  });

  return c.json({ ok: true, results });
});

const RAINDROP_API = "https://api.raindrop.io/rest/v1";

// POST /api/sync/links/fetch — fetch links from Raindrop and sync into DB
// Filters by #toblog tag (same as CLI) to avoid pulling all 3000+ bookmarks
app.post("/links/fetch", async (c) => {
  const token = c.env.RAINDROP_ACCESS_TOKEN;
  if (!token) {
    return c.json({ error: "not_configured", message: "RAINDROP_ACCESS_TOKEN secret is not set" }, 503);
  }

  const tag = "toblog";
  const db = drizzle(c.env.DB, { schema });
  const allItems: any[] = [];
  let page = 0;

  while (true) {
    const res = await fetch(
      `${RAINDROP_API}/raindrops/0?search=%23${encodeURIComponent(tag)}&page=${page}&perpage=50`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      return c.json({ error: "raindrop_error", message: `Raindrop API returned ${res.status}` }, 502);
    }
    const json = await res.json() as any;
    const items = json.items ?? [];
    for (const item of items) {
      allItems.push({
        title: item.title || item.domain || "Untitled",
        url: item.link,
        date: (item.created ?? "").split("T")[0],
        excerpt: item.excerpt || null,
        cover: item.cover || null,
        tags: item.tags ?? [],
      });
    }
    if (items.length < 50) break;
    page++;
  }

  // Sort by date descending
  allItems.sort((a, b) => b.date.localeCompare(a.date));

  // Delete all + insert
  await db.delete(schema.links);
  const rows = allItems.map((item) => ({
    title: String(item.title),
    url: String(item.url),
    date: String(item.date),
    excerpt: item.excerpt ? String(item.excerpt) : null,
    cover: item.cover ? String(item.cover) : null,
    tags: JSON.stringify(item.tags),
  }));
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(schema.links).values(rows.slice(i, i + BATCH_SIZE));
  }

  // Store sync timestamp
  await db.insert(schema.config).values({
    key: "last_links_sync",
    value: JSON.stringify(new Date().toISOString()),
  }).onConflictDoUpdate({
    target: schema.config.key,
    set: { value: JSON.stringify(new Date().toISOString()) },
  });

  return c.json({ ok: true, count: allItems.length });
});

export default app;
