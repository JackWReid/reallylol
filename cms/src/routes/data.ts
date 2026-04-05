import { Hono } from "hono";
import { eq, and, desc, sql, notInArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "../lib/types";

const app = new Hono<{ Bindings: Env }>();

// GET /api/data/books?shelf=read
app.get("/books", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const shelf = c.req.query("shelf");

  const conditions = [];
  if (shelf) conditions.push(eq(schema.books.shelf, shelf));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      title: schema.books.title,
      author: schema.books.author,
      date_updated: schema.books.date_updated,
      image_url: schema.books.image_url,
      hardcover_url: schema.books.hardcover_url,
    })
    .from(schema.books)
    .where(where)
    .orderBy(desc(schema.books.date_updated));

  return c.json(rows);
});

// GET /api/data/films?list=watched
app.get("/films", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const list = c.req.query("list");

  const conditions = [];
  if (list) conditions.push(eq(schema.films.list, list));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      name: schema.films.name,
      year: schema.films.year,
      date_updated: schema.films.date_updated,
    })
    .from(schema.films)
    .where(where)
    .orderBy(desc(schema.films.date_updated));

  return c.json(rows);
});

// GET /api/data/links
app.get("/links", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  const rows = await db
    .select()
    .from(schema.links)
    .orderBy(desc(schema.links.date));

  return c.json(
    rows.map((r) => ({
      title: r.title,
      url: r.url,
      date: r.date,
      excerpt: r.excerpt,
      cover: r.cover,
      tags: JSON.parse(r.tags),
    })),
  );
});

// GET /api/data/random-photos — published photos excluding configured tags
app.get("/random-photos", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  // Get excluded tags from config
  const configRow = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, "exclude_tags"))
    .get();
  const excludeTags: string[] = configRow ? JSON.parse(configRow.value) : [];

  // Get published photos
  let photoQuery = db
    .select({ id: schema.content.id, slug: schema.content.slug })
    .from(schema.content)
    .where(
      and(
        eq(schema.content.type, "photo"),
        eq(schema.content.status, "published"),
      ),
    );

  const photos = await photoQuery;

  // Filter out photos with excluded tags
  let eligiblePhotos = photos;
  if (excludeTags.length > 0) {
    const excludedTagIds = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(
        sql`${schema.tags.name} IN (${sql.join(
          excludeTags.map((t) => sql`${t}`),
          sql`, `,
        )})`,
      );

    if (excludedTagIds.length > 0) {
      const excludedContentIds = await db
        .select({ content_id: schema.contentTags.content_id })
        .from(schema.contentTags)
        .where(
          sql`${schema.contentTags.tag_id} IN (${sql.join(
            excludedTagIds.map((r) => sql`${r.id}`),
            sql`, `,
          )})`,
        );

      const excludedIds = new Set(excludedContentIds.map((r) => r.content_id));
      eligiblePhotos = photos.filter((p) => !excludedIds.has(p.id));
    }
  }

  return c.json(eligiblePhotos.map((p) => ({ path: `photo/${p.slug}` })));
});

// GET /api/data/stats — dashboard stats
app.get("/stats", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  // Content counts by type
  const contentCounts = await db
    .select({ type: schema.content.type, count: sql<number>`count(*)` })
    .from(schema.content)
    .groupBy(schema.content.type);

  // Synced data counts
  const [booksCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.books);
  const [filmsCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.films);
  const [linksCount] = await db.select({ count: sql<number>`count(*)` }).from(schema.links);

  // Config values (last build, last syncs)
  const configRows = await db.select().from(schema.config);
  const config: Record<string, unknown> = {};
  for (const row of configRows) {
    config[row.key] = JSON.parse(row.value);
  }

  return c.json({
    content: Object.fromEntries(contentCounts.map((r) => [r.type, r.count])),
    books: booksCount.count,
    films: filmsCount.count,
    links: linksCount.count,
    last_build_triggered: config.last_build_triggered ?? null,
    last_books_sync: config.last_books_sync ?? null,
    last_links_sync: config.last_links_sync ?? null,
  });
});

// GET /api/data/config
app.get("/config", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const rows = await db.select().from(schema.config);

  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = JSON.parse(row.value);
  }
  return c.json(result);
});

// PUT /api/data/config/:key — update a config value
app.put("/config/:key", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const key = c.req.param("key");
  const body = await c.req.json();

  await db
    .insert(schema.config)
    .values({ key, value: JSON.stringify(body.value) })
    .onConflictDoUpdate({
      target: schema.config.key,
      set: { value: JSON.stringify(body.value) },
    });

  return c.json({ ok: true });
});

export default app;
