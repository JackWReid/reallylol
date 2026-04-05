import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../db/schema";

export interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  API_KEY: string;
  CF_PAGES_DEPLOY_HOOK?: string;
  HARDCOVER_API_KEY?: string;
  RAINDROP_ACCESS_TOKEN?: string;
  SITE_URL: string;
  MEDIA_URL: string;
}

export type Database = DrizzleD1Database<typeof schema>;

export interface AppContext {
  db: Database;
  env: Env;
}
