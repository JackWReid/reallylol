import { Hono } from "hono";
import { eq, sql, and, like, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "../lib/types";
import type { MediaKind } from "../../../shared/types";
import { MEDIA_KINDS } from "../../../shared/types";

const app = new Hono<{ Bindings: Env }>();

function inferKind(contentType: string): MediaKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("audio/")) return "audio";
  return "file";
}

function inferContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    m4a: "audio/mp4",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
    wav: "audio/wav",
    mp4: "video/mp4",
    pdf: "application/pdf",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

// GET /api/media — list media with filtering
app.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });

  const kind = c.req.query("kind") as MediaKind | undefined;
  const prefix = c.req.query("prefix");
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(c.req.query("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (kind && MEDIA_KINDS.includes(kind)) {
    conditions.push(eq(schema.media.kind, kind));
  }
  if (prefix) {
    conditions.push(like(schema.media.r2_key, `${prefix}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.media)
    .where(where);

  const rows = await db
    .select()
    .from(schema.media)
    .where(where)
    .orderBy(desc(schema.media.uploaded_at))
    .limit(limit)
    .offset(offset);

  // Find content items referencing these media keys.
  // Check meta fields (photo.image, post.media_image) and body shortcodes (audio/image src).
  const r2KeySet = new Set(rows.map((r) => r.r2_key));
  // Also build a set of just the filenames for matching shortcode relative paths
  const filenameToKey = new Map<string, string>();
  for (const key of r2KeySet) {
    const filename = key.split("/").pop();
    if (filename) filenameToKey.set(filename, key);
  }
  const refs = new Map<string, Array<{ type: string; slug: string; title: string }>>();

  if (r2KeySet.size > 0) {
    // Query content with non-empty meta OR body containing potential media refs
    const contentRows = await db
      .select({
        type: schema.content.type,
        slug: schema.content.slug,
        title: schema.content.title,
        meta: schema.content.meta,
        body: schema.content.body,
      })
      .from(schema.content)
      .where(
        sql`${schema.content.meta} != '{}' OR ${schema.content.body} LIKE '%src=%'`,
      );

    function addRef(key: string, row: { type: string; slug: string; title: string }) {
      const existing = refs.get(key) ?? [];
      existing.push({ type: row.type, slug: row.slug, title: row.title });
      refs.set(key, existing);
    }

    for (const row of contentRows) {
      // Check meta values
      const meta = JSON.parse(row.meta) as Record<string, unknown>;
      for (const val of Object.values(meta)) {
        if (typeof val === "string" && r2KeySet.has(val)) {
          addRef(val, row);
        }
      }
      // Check body for shortcode src attributes (audio/image)
      if (row.body) {
        const srcMatches = row.body.matchAll(/src=["']([^"']+)["']/g);
        for (const match of srcMatches) {
          const src = match[1];
          // Direct R2 key match
          if (r2KeySet.has(src)) {
            addRef(src, row);
          } else {
            // Match by filename (shortcodes use /audio/journal/foo.m4a or relative paths)
            const filename = src.split("/").pop();
            if (filename && filenameToKey.has(filename)) {
              addRef(filenameToKey.get(filename)!, row);
            }
          }
        }
      }
    }
  }

  const itemsWithRefs = rows.map((row) => ({
    ...row,
    content_refs: refs.get(row.r2_key) ?? [],
  }));

  return c.json({ items: itemsWithRefs, total: count, page, limit });
});

// POST /api/media/upload — upload a file to R2
app.post("/upload", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const r2Key = formData.get("key") as string | null;

  if (!file) {
    return c.json({ error: "validation", message: "file is required" }, 400);
  }
  if (!r2Key) {
    return c.json({ error: "validation", message: "key is required" }, 400);
  }

  const contentType = file.type || inferContentType(file.name);
  const kind = inferKind(contentType);

  // Upload to R2
  await c.env.MEDIA.put(r2Key, file.stream(), {
    httpMetadata: { contentType },
  });

  // Record in DB
  const now = new Date().toISOString();
  try {
    const [row] = await db
      .insert(schema.media)
      .values({
        r2_key: r2Key,
        kind,
        content_type: contentType,
        size_bytes: file.size,
        uploaded_at: now,
      })
      .returning();

    return c.json(row, 201);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE constraint")) {
      // Already tracked — update the record
      const [row] = await db
        .update(schema.media)
        .set({
          kind,
          content_type: contentType,
          size_bytes: file.size,
          uploaded_at: now,
        })
        .where(eq(schema.media.r2_key, r2Key))
        .returning();
      return c.json(row);
    }
    throw e;
  }
});

// POST /api/media/sync — scan R2 bucket and register objects in the DB
// Paginated: returns next_cursor when there are more objects to process.
// The CLI should loop until next_cursor is null.
app.post("/sync", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const prefix = c.req.query("prefix") ?? "";
  const startCursor = c.req.query("cursor") ?? undefined;
  const maxOps = 900; // stay under D1's 1000 queries/invocation limit

  let registered = 0;
  let skipped = 0;
  let ops = 0;
  let cursor = startCursor;
  let done = false;

  while (!done && ops < maxOps) {
    const listOpts: R2ListOptions = { limit: 500 };
    if (prefix) listOpts.prefix = prefix;
    if (cursor) listOpts.cursor = cursor;

    const listed = await c.env.MEDIA.list(listOpts);
    ops++; // R2 list counts as an op for our budget

    for (const obj of listed.objects) {
      if (ops >= maxOps) {
        // Return cursor so CLI can resume from this R2 page
        return c.json({ registered, skipped, next_cursor: cursor, done: false });
      }
      const contentType = inferContentType(obj.key);
      try {
        await db.insert(schema.media).values({
          r2_key: obj.key,
          kind: inferKind(contentType),
          content_type: contentType,
          size_bytes: obj.size,
          uploaded_at: obj.uploaded.toISOString(),
        }).onConflictDoNothing();
        registered++;
      } catch {
        skipped++;
      }
      ops++;
    }

    if (listed.truncated) {
      cursor = listed.cursor;
    } else {
      done = true;
    }
  }

  if (done) {
    return c.json({ registered, skipped, next_cursor: null, done: true });
  }
  return c.json({ registered, skipped, next_cursor: cursor, done: false });
});

// DELETE /api/media/:id — remove from R2 and DB
app.delete("/:id", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const id = parseInt(c.req.param("id"), 10);

  const row = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.id, id))
    .get();

  if (!row) {
    return c.json({ error: "not_found", message: "Media not found" }, 404);
  }

  // Delete from R2
  await c.env.MEDIA.delete(row.r2_key);

  // Delete from DB
  await db.delete(schema.media).where(eq(schema.media.id, id));

  return c.json({ ok: true });
});

export default app;
