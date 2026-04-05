import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import type { Env } from "../lib/types";

const app = new Hono<{ Bindings: Env }>();

// POST /api/build/trigger — trigger a CF Pages rebuild
app.post("/trigger", async (c) => {
  const hookUrl = c.env.CF_PAGES_DEPLOY_HOOK;
  if (!hookUrl) {
    return c.json(
      { error: "not_configured", message: "CF_PAGES_DEPLOY_HOOK secret is not set" },
      503,
    );
  }

  const res = await fetch(hookUrl, { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    return c.json(
      { error: "build_failed", message: `Deploy hook returned ${res.status}: ${text}` },
      502,
    );
  }

  // Store last build timestamp
  const db = drizzle(c.env.DB, { schema });
  const now = new Date().toISOString();
  await db.insert(schema.config).values({
    key: "last_build_triggered",
    value: JSON.stringify(now),
  }).onConflictDoUpdate({
    target: schema.config.key,
    set: { value: JSON.stringify(now) },
  });

  return c.json({ ok: true, message: "Build triggered", triggered_at: now });
});

export default app;
