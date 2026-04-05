/**
 * One-time migration: import existing markdown content files and JSON data into the CMS.
 */

import { readdirSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { CmsApi } from "../lib/api";
import type { ContentType } from "../../../shared/types";

const api = new CmsApi();

// Simplified frontmatter parser that handles arrays
function parseFrontmatter(text: string): {
  fields: Record<string, unknown>;
  body: string;
} | null {
  if (!text.startsWith("---")) return null;
  const endIdx = text.indexOf("---", 3);
  if (endIdx === -1) return null;

  const fm = text.slice(3, endIdx);
  const body = text.slice(endIdx + 3).trim();
  const fields: Record<string, unknown> = {};

  const lines = fm.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Key-value pair
    const match = line.match(/^(\w[\w_]*)\s*:\s*(.*)/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();

      // Check if it's an inline array: [val1, val2]
      if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1);
        fields[key] = inner
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      } else if (value === "" || value === undefined) {
        // Might be a YAML list on following lines
        const items: string[] = [];
        while (i + 1 < lines.length && lines[i + 1].match(/^\s+-\s+/)) {
          i++;
          const item = lines[i].replace(/^\s+-\s+/, "").trim().replace(/^['"]|['"]$/g, "");
          items.push(item);
        }
        if (items.length > 0) {
          fields[key] = items;
        } else {
          fields[key] = "";
        }
      } else if (value === "true") {
        fields[key] = true;
      } else if (value === "false") {
        fields[key] = false;
      } else if (/^\d+(\.\d+)?$/.test(value)) {
        fields[key] = parseFloat(value);
      } else {
        // Strip quotes
        fields[key] = value.replace(/^['"]|['"]$/g, "");
      }
    }
    i++;
  }

  return { fields, body };
}

// Determine slug from filename.
// Use full stem (including date) to avoid collisions for numeric-only slugs.
function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/, "");
}

export async function migrateCommand(args: string[]): Promise<void> {
  const sub = args[0];
  if (sub !== "import") {
    console.error("Usage: cms migrate import [--content-dir path] [--data-dir path] [--dry-run]");
    process.exit(1);
  }

  const flags = new Map<string, string>();
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, "true");
      }
    }
  }

  const root = process.cwd();
  const contentDir = flags.get("content-dir") ?? resolve(root, "src/content");
  const dataDir = flags.get("data-dir") ?? resolve(root, "src/data");
  const dryRun = flags.has("dry-run");

  console.error("=== Migrating content ===");
  await migrateContent(contentDir, dryRun);

  console.error("\n=== Migrating data ===");
  await migrateData(dataDir, dryRun);

  console.error("\n=== Migrating config ===");
  await migrateConfig(dataDir, dryRun);
}

const CONTENT_TYPES: ContentType[] = ["post", "note", "photo", "highlight", "page"];
// Meta fields per type (fields that go into the meta JSON, not top-level)
const META_FIELDS: Record<ContentType, string[]> = {
  post: ["subtitle", "book_author", "movie_released", "media_image", "rating", "url"],
  note: [],
  photo: ["image", "location", "instagram"],
  highlight: ["link", "url"],
  page: ["layout", "url"],
};

async function migrateContent(contentDir: string, dryRun: boolean): Promise<void> {
  let total = 0;
  let errors = 0;

  for (const type of CONTENT_TYPES) {
    const dir = resolve(contentDir, type);
    if (!existsSync(dir)) {
      console.error(`  Skipping ${type}/ (not found)`);
      continue;
    }

    const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
    console.error(`  ${type}/: ${files.length} files`);

    for (const file of files) {
      const text = readFileSync(resolve(dir, file), "utf-8");
      const parsed = parseFrontmatter(text);
      if (!parsed) {
        console.error(`    SKIP ${file}: no frontmatter`);
        errors++;
        continue;
      }

      const { fields, body } = parsed;
      const slug = (fields.slug as string) || slugFromFilename(file);
      const title = String(fields.title ?? slug);

      // Extract date
      let date = fields.date as string | undefined;
      if (date) {
        date = String(date);
      } else {
        // Try to extract from filename
        const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
        date = dateMatch ? dateMatch[1] : new Date().toISOString();
      }

      // Extract tags
      const tags = Array.isArray(fields.tags)
        ? (fields.tags as string[])
        : typeof fields.tags === "string" && fields.tags
          ? [fields.tags]
          : type === "post"
            ? ["journal"]
            : [];

      // Build meta from type-specific fields
      const metaFields = META_FIELDS[type] ?? [];
      const meta: Record<string, unknown> = {};
      for (const key of metaFields) {
        if (fields[key] !== undefined && fields[key] !== "") {
          meta[key] = fields[key];
        }
      }

      const payload = {
        type,
        slug,
        title,
        body,
        date,
        status: "published" as const,
        meta,
        tags,
      };

      if (dryRun) {
        console.error(`    DRY-RUN: ${type}/${slug}`);
      } else {
        try {
          await api.post("/api/content", payload);
          total++;
          if (total % 50 === 0) console.error(`    ...${total} imported`);
        } catch (e: unknown) {
          if (e instanceof Error && e.message.includes("already exists")) {
            // Update instead
            try {
              await api.put(`/api/content/${type}/${slug}`, {
                title,
                body,
                date,
                status: "published",
                meta,
                tags,
              });
              total++;
            } catch (e2) {
              console.error(`    ERROR ${type}/${slug}: ${e2}`);
              errors++;
            }
          } else {
            console.error(`    ERROR ${type}/${slug}: ${e}`);
            errors++;
          }
        }
      }
    }
  }

  // Also handle links pages (now stored as "page" type) if they exist
  const linksDir = resolve(contentDir, "links");
  if (existsSync(linksDir)) {
    const files = readdirSync(linksDir).filter((f) => f.endsWith(".md"));
    console.error(`  links/ (as page): ${files.length} files`);
    for (const file of files) {
      const text = readFileSync(resolve(linksDir, file), "utf-8");
      const parsed = parseFrontmatter(text);
      if (!parsed) continue;
      const slug = slugFromFilename(file);
      const payload = {
        type: "page" as const,
        slug,
        title: String(parsed.fields.title ?? slug),
        body: parsed.body,
        date: String(parsed.fields.date ?? new Date().toISOString()),
        status: "published" as const,
        meta: parsed.fields.url ? { url: parsed.fields.url } : {},
        tags: [],
      };
      if (!dryRun) {
        try {
          await api.post("/api/content", payload);
          total++;
        } catch {
          // Ignore duplicates
        }
      }
    }
  }

  console.error(`\nContent migration: ${total} imported, ${errors} errors`);
}

async function migrateData(dataDir: string, dryRun: boolean): Promise<void> {
  // Books
  for (const shelf of ["read", "reading", "toread"]) {
    const path = resolve(dataDir, `books/${shelf}.json`);
    if (!existsSync(path)) continue;
    const items = JSON.parse(readFileSync(path, "utf-8"));
    console.error(`  books/${shelf}.json: ${items.length} items`);
    if (!dryRun) {
      await api.post("/api/sync/books", { shelf, items });
    }
  }

  // Films
  for (const list of ["watched", "towatch"]) {
    const path = resolve(dataDir, `films/${list}.json`);
    if (!existsSync(path)) continue;
    const items = JSON.parse(readFileSync(path, "utf-8"));
    console.error(`  films/${list}.json: ${items.length} items`);
    if (!dryRun) {
      await api.post("/api/sync/films", { list, items });
    }
  }

  // Links
  const linksPath = resolve(dataDir, "links.json");
  if (existsSync(linksPath)) {
    const items = JSON.parse(readFileSync(linksPath, "utf-8"));
    console.error(`  links.json: ${items.length} items`);
    if (!dryRun) {
      await api.post("/api/sync/links", { items });
    }
  }
}

async function migrateConfig(dataDir: string, dryRun: boolean): Promise<void> {
  const configPath = resolve(dataDir, "content_config.json");
  if (!existsSync(configPath)) {
    console.error("  No content_config.json found");
    return;
  }

  const config = JSON.parse(readFileSync(configPath, "utf-8"));

  if (config.exclude_tags && !dryRun) {
    await api.put("/api/data/config/exclude_tags", {
      value: config.exclude_tags,
    });
    console.error(`  exclude_tags: ${config.exclude_tags.length} tags`);
  }

  if (config.map_tag_names && !dryRun) {
    await api.put("/api/data/config/map_tag_names", {
      value: config.map_tag_names,
    });
    console.error(`  map_tag_names: ${Object.keys(config.map_tag_names).length} mappings`);
  }
}
