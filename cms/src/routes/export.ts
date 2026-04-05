import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "../lib/types";
import type { ContentType } from "../../../shared/types";

const app = new Hono<{ Bindings: Env }>();

function generateFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
    } else if (typeof value === "object") {
      // Skip empty objects
      if (Object.keys(value).length === 0) continue;
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

// GET /api/export?format=json|markdown — export all content
app.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const format = c.req.query("format") ?? "json";
  const type = c.req.query("type") as ContentType | undefined;

  // Fetch all content
  const conditions = type ? eq(schema.content.type, type) : undefined;
  const rows = await db
    .select()
    .from(schema.content)
    .where(conditions)
    .orderBy(desc(schema.content.date));

  // Fetch all tags
  const allTags = await db
    .select({
      content_id: schema.contentTags.content_id,
      name: schema.tags.name,
    })
    .from(schema.contentTags)
    .innerJoin(schema.tags, eq(schema.contentTags.tag_id, schema.tags.id));

  const tagsMap = new Map<number, string[]>();
  for (const row of allTags) {
    const existing = tagsMap.get(row.content_id) ?? [];
    existing.push(row.name);
    tagsMap.set(row.content_id, existing);
  }

  if (format === "markdown") {
    // Return as JSON array of {filename, content} pairs
    const files = rows.map((row) => {
      const tags = tagsMap.get(row.id) ?? [];
      const meta = JSON.parse(row.meta);
      const datePrefix = row.date.slice(0, 10);
      const filename = `${row.type}/${datePrefix}-${row.slug}.md`;

      const frontmatterFields: Record<string, unknown> = {
        title: row.title,
        date: row.date,
      };

      if (row.slug !== `${datePrefix}-${row.slug}`) {
        frontmatterFields.slug = row.slug;
      }
      if (tags.length > 0) frontmatterFields.tags = tags;

      // Merge type-specific meta into frontmatter
      for (const [key, value] of Object.entries(meta)) {
        frontmatterFields[key] = value;
      }

      const frontmatter = generateFrontmatter(frontmatterFields);
      const content = row.body ? `${frontmatter}\n\n${row.body}\n` : `${frontmatter}\n`;

      return { filename, content };
    });

    return c.json({ files });
  }

  // JSON format: return structured data
  const items = rows.map((row) => ({
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    body: row.body,
    date: row.date,
    status: row.status,
    meta: JSON.parse(row.meta),
    tags: tagsMap.get(row.id) ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  // Also export synced data
  const books = await db.select().from(schema.books);
  const films = await db.select().from(schema.films);
  const links = await db.select().from(schema.links);
  const config = await db.select().from(schema.config);

  return c.json({
    content: items,
    books,
    films,
    links: links.map((l) => ({ ...l, tags: JSON.parse(l.tags) })),
    config: Object.fromEntries(config.map((c) => [c.key, JSON.parse(c.value)])),
  });
});

export default app;
