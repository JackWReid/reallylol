import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "../lib/types";

const app = new Hono<{ Bindings: Env }>();

// GET /api/tags — list all tags with counts, optionally filtered by content type
app.get("/", async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const type = c.req.query("type");

  let query;
  if (type) {
    query = db
      .select({
        name: schema.tags.name,
        count: sql<number>`count(*)`,
      })
      .from(schema.tags)
      .innerJoin(schema.contentTags, eq(schema.tags.id, schema.contentTags.tag_id))
      .innerJoin(
        schema.content,
        eq(schema.contentTags.content_id, schema.content.id),
      )
      .where(eq(schema.content.type, type))
      .groupBy(schema.tags.name)
      .orderBy(schema.tags.name);
  } else {
    query = db
      .select({
        name: schema.tags.name,
        count: sql<number>`count(*)`,
      })
      .from(schema.tags)
      .innerJoin(schema.contentTags, eq(schema.tags.id, schema.contentTags.tag_id))
      .groupBy(schema.tags.name)
      .orderBy(schema.tags.name);
  }

  const rows = await query;
  return c.json(rows);
});

export default app;
