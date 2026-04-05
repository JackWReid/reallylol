import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./lib/types";
import { authMiddleware } from "./middleware/auth";
import contentRoutes from "./routes/content";
import tagsRoutes from "./routes/tags";
import mediaRoutes from "./routes/media";
import syncRoutes from "./routes/sync";
import dataRoutes from "./routes/data";
import exportRoutes from "./routes/export";
import buildRoutes from "./routes/build";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use("*", cors());

// Auth on all /api routes except health
app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") return next();
  return authMiddleware(c, next);
});

// Health check (no auth required)
app.get("/api/health", (c) => c.json({ ok: true }));

// Auth verification (requires auth via the middleware above)
app.get("/api/auth/verify", (c) => c.json({ ok: true }));

// Mount routes
app.route("/api/content", contentRoutes);
app.route("/api/tags", tagsRoutes);
app.route("/api/media", mediaRoutes);
app.route("/api/sync", syncRoutes);
app.route("/api/data", dataRoutes);
app.route("/api/export", exportRoutes);
app.route("/api/build", buildRoutes);

export default app;
