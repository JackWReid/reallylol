import type { MiddlewareHandler } from "hono";
import type { Env } from "../lib/types";

export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (
  c,
  next,
) => {
  const header = c.req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized", message: "Missing bearer token" }, 401);
  }

  const token = header.slice(7);
  if (token !== c.env.API_KEY) {
    return c.json({ error: "unauthorized", message: "Invalid API key" }, 401);
  }

  await next();
};
