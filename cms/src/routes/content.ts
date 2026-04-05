import { Hono } from "hono";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "../lib/types";
import { CONTENT_TYPES, CONTENT_STATUSES } from "../../../shared/types";
import type {
  ContentType,
  ContentStatus,
  ContentItem,
} from "../../../shared/types";

const app = new Hono<{ Bindings: Env }>();

// Helper: get tags for a content item
async function getTagsForContent(
  db: ReturnType<typeof drizzle>,
  contentId: number,
): Promise<string[]> {
  const rows = await db
    .select({ name: schema.tags.name })
    .from(schema.contentTags)
    .innerJoin(schema.tags, eq(schema.contentTags.tag_id, schema.tags.id))
    .where(eq(schema.contentTags.content_id, contentId));
  return rows.map((r) => r.name);
}

// Helper: get tags for multiple content items
async function getTagsForContentIds(
  db: ReturnType<typeof drizzle>,
  contentIds: number[],
): Promise<Map<number, string[]>> {
  if (contentIds.length === 0) return new Map();
  const rows = await db
    .select({
      content_id: schema.contentTags.content_id,
      name: schema.tags.name,
    })
    .from(schema.contentTags)
    .innerJoin(schema.tags, eq(schema.contentTags.tag_id, schema.tags.id))
    .where(inArray(schema.contentTags.content_id, contentIds));

  const map = new Map<number, string[]>();
  for (const row of rows) {
    const existing = map.get(row.content_id) ?? [];
    existing.push(row.name);
    map.set(row.content_id, existing);
  }
  return map;
}

// Helper: ensure tags exist and return their IDs
async function ensureTagIds(
  db: ReturnType<typeof drizzle>,
  tagNames: string[],
): Promise<number[]> {
  if (tagNames.length === 0) return [];
  const ids: number[] = [];
  for (const name of tagNames) {
    // Insert or ignore, then select
    await db
      .insert(schema.tags)
      .values({ name })
      .onConflictDoNothing();
    const [row] = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.name, name));
    if (row) ids.push(row.id);
  }
  return ids;
}

// Helper: set tags for a content item (replace all)
async function setContentTags(
  db: ReturnType<typeof drizzle>,
  contentId: number,
  tagNames: string[],
): Promise<void> {
  // Remove existing
  await db
    .delete(schema.contentTags)
    .where(eq(schema.contentTags.content_id, contentId));

  const uniqueNames = [...new Set(tagNames)];
  if (uniqueNames.length === 0) return;

  const tagIds = await ensureTagIds(db, uniqueNames);
  await db.insert(schema.contentTags).values(
    tagIds.map((tag_id) => ({ content_id: contentId, tag_id })),
  );
}

// Helper: format a DB row + tags into ContentItem
function toContentItem(
  row: typeof schema.content.$inferSelect,
  itemTags: string[],
): ContentItem {
  return {
    id: row.id,
    type: row.type as ContentType,
    slug: row.slug,
    title: row.title,
    body: row.body,
    date: row.date,
    status: row.status as ContentStatus,
    meta: JSON.parse(row.meta),
    tags: itemTags,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// GET /api/content — list content with filtering and pagination
app.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  const type = c.req.query("type") as ContentType | undefined;
  const excludeTypes = c.req.query("exclude_types"); // comma-separated
  const status = c.req.query("status") as ContentStatus | undefined;
  const tag = c.req.query("tag");
  const sort = c.req.query("sort") ?? "date";
  const order = c.req.query("order") ?? "desc";
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
  const limit = Math.min(1000, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  // Build conditions
  const conditions = [];
  if (type && CONTENT_TYPES.includes(type)) {
    conditions.push(eq(schema.content.type, type));
  } else if (excludeTypes) {
    const excluded = excludeTypes.split(",").filter((t) => CONTENT_TYPES.includes(t as ContentType));
    if (excluded.length > 0) {
      conditions.push(sql`${schema.content.type} NOT IN (${sql.join(excluded.map(t => sql`${t}`), sql`, `)})`);
    }
  }
  if (status && CONTENT_STATUSES.includes(status)) {
    conditions.push(eq(schema.content.status, status));
  }

  // If filtering by tag, join through content_tags
  if (tag) {
    const tagRow = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.name, tag))
      .get();
    if (!tagRow) {
      return c.json({ items: [], total: 0, page, limit });
    }
    // Get content IDs that have this tag
    const taggedIds = await db
      .select({ content_id: schema.contentTags.content_id })
      .from(schema.contentTags)
      .where(eq(schema.contentTags.tag_id, tagRow.id));
    const ids = taggedIds.map((r) => r.content_id);
    if (ids.length === 0) {
      return c.json({ items: [], total: 0, page, limit });
    }
    conditions.push(inArray(schema.content.id, ids));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.content)
    .where(where);

  // Query
  const sortCol =
    sort === "created_at"
      ? schema.content.created_at
      : sort === "updated_at"
        ? schema.content.updated_at
        : sort === "title"
          ? schema.content.title
          : schema.content.date;
  const orderFn = order === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(schema.content)
    .where(where)
    .orderBy(orderFn(sortCol))
    .limit(limit)
    .offset(offset);

  const tagsMap = await getTagsForContentIds(
    db,
    rows.map((r) => r.id),
  );

  const items = rows.map((row) =>
    toContentItem(row, tagsMap.get(row.id) ?? []),
  );

  return c.json({ items, total: count, page, limit });
});

// GET /api/content/:type/:slug — get a single content item
app.get("/:type/:slug", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const { type, slug } = c.req.param();

  const row = await db
    .select()
    .from(schema.content)
    .where(and(eq(schema.content.type, type), eq(schema.content.slug, slug)))
    .get();

  if (!row) {
    return c.json({ error: "not_found", message: `${type}/${slug} not found` }, 404);
  }

  const itemTags = await getTagsForContent(db, row.id);
  return c.json(toContentItem(row, itemTags));
});

// POST /api/content — create a new content item
app.post("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const body = await c.req.json();

  const { type, slug, title } = body;
  if (!type || !slug || !title) {
    return c.json(
      { error: "validation", message: "type, slug, and title are required" },
      400,
    );
  }
  if (!CONTENT_TYPES.includes(type)) {
    return c.json(
      { error: "validation", message: `Invalid type: ${type}` },
      400,
    );
  }

  const now = new Date().toISOString();
  const values = {
    type,
    slug,
    title,
    body: body.body ?? "",
    date: body.date ?? now,
    status: body.status ?? "draft",
    meta: JSON.stringify(body.meta ?? {}),
    created_at: now,
    updated_at: now,
  };

  try {
    const result = await db.insert(schema.content).values(values).returning();
    const row = result[0];

    if (body.tags && Array.isArray(body.tags)) {
      await setContentTags(db, row.id, body.tags);
    }

    const itemTags = await getTagsForContent(db, row.id);
    return c.json(toContentItem(row, itemTags), 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint")) {
      return c.json(
        { error: "conflict", message: `${type}/${slug} already exists` },
        409,
      );
    }
    throw e;
  }
});

// PUT /api/content/:type/:slug — update a content item
app.put("/:type/:slug", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const { type, slug } = c.req.param();
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(schema.content)
    .where(and(eq(schema.content.type, type), eq(schema.content.slug, slug)))
    .get();

  if (!existing) {
    return c.json({ error: "not_found", message: `${type}/${slug} not found` }, 404);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.title !== undefined) updates.title = body.title;
  if (body.body !== undefined) updates.body = body.body;
  if (body.date !== undefined) updates.date = body.date;
  if (body.status !== undefined) updates.status = body.status;
  if (body.meta !== undefined) updates.meta = JSON.stringify(body.meta);

  const result = await db
    .update(schema.content)
    .set(updates)
    .where(eq(schema.content.id, existing.id))
    .returning();
  const row = result[0];

  if (body.tags !== undefined && Array.isArray(body.tags)) {
    await setContentTags(db, row.id, body.tags);
  }

  const itemTags = await getTagsForContent(db, row.id);
  return c.json(toContentItem(row, itemTags));
});

// DELETE /api/content/:type/:slug — delete a content item
app.delete("/:type/:slug", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const { type, slug } = c.req.param();

  const existing = await db
    .select({ id: schema.content.id })
    .from(schema.content)
    .where(and(eq(schema.content.type, type), eq(schema.content.slug, slug)))
    .get();

  if (!existing) {
    return c.json({ error: "not_found", message: `${type}/${slug} not found` }, 404);
  }

  // Tags cascade-delete via FK
  await db.delete(schema.content).where(eq(schema.content.id, existing.id));

  return c.json({ ok: true });
});

export default app;

// Re-export the shared import path for the routes
export { schema };
