/**
 * One-time: import posts that live in subdirectories (index.md + co-located images).
 * These were missed by the initial migration which only scanned for *.md files.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { resolve, join } from "path";
import { CmsApi } from "../lib/api";

const api = new CmsApi();

function parseFrontmatter(text: string): { fields: Record<string, unknown>; body: string } | null {
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
    const match = line.match(/^(\w[\w_]*)\s*:\s*(.*)/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      if (value.startsWith("[") && value.endsWith("]")) {
        fields[key] = value.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      } else if (value === "") {
        const items: string[] = [];
        while (i + 1 < lines.length && lines[i + 1].match(/^\s+-\s+/)) {
          i++;
          items.push(lines[i].replace(/^\s+-\s+/, "").trim().replace(/^['"]|['"]$/g, ""));
        }
        fields[key] = items.length > 0 ? items : "";
      } else if (value === "true") { fields[key] = true; }
      else if (value === "false") { fields[key] = false; }
      else if (/^\d+(\.\d+)?$/.test(value)) { fields[key] = parseFloat(value); }
      else { fields[key] = value.replace(/^['"]|['"]$/g, ""); }
    }
    i++;
  }
  return { fields, body };
}

const META_FIELDS = ["subtitle", "book_author", "movie_released", "media_image", "rating", "url"];

export async function migrateDirsCommand(args: string[]): Promise<void> {
  const positional = args.filter((a) => !a.startsWith("--"));
  const contentDir = positional[0] ?? resolve(process.cwd(), "site/src/content/post");
  const dryRun = args.includes("--dry-run");
  const uploadImages = !args.includes("--skip-images");

  if (!existsSync(contentDir)) {
    console.error(`Directory not found: ${contentDir}`);
    process.exit(1);
  }

  const entries = readdirSync(contentDir);
  let imported = 0;
  let imagesUploaded = 0;

  for (const entry of entries.sort()) {
    const dirPath = resolve(contentDir, entry);
    if (!statSync(dirPath).isDirectory()) continue;

    const indexPath = join(dirPath, "index.md");
    if (!existsSync(indexPath)) continue;

    const text = readFileSync(indexPath, "utf-8");
    const parsed = parseFrontmatter(text);
    if (!parsed) {
      console.error(`  SKIP ${entry}: no frontmatter`);
      continue;
    }

    const { fields, body } = parsed;
    const slug = entry; // directory name is the slug
    const title = String(fields.title ?? slug);
    const date = fields.date ? String(fields.date) : entry.match(/^(\d{4}-\d{2}-\d{2})/) ? entry.match(/^(\d{4}-\d{2}-\d{2})/)![1] : new Date().toISOString();
    const tags = Array.isArray(fields.tags) ? fields.tags as string[] : typeof fields.tags === "string" && fields.tags ? [fields.tags] : ["journal"];

    const meta: Record<string, unknown> = {};
    for (const key of META_FIELDS) {
      if (fields[key] !== undefined && fields[key] !== "") meta[key] = fields[key];
    }

    // Upload co-located images to R2
    if (uploadImages) {
      const files = readdirSync(dirPath).filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
      for (const imgFile of files) {
        const r2Key = `img/post/${entry}/${imgFile}`;
        const imgPath = join(dirPath, imgFile);
        if (!dryRun) {
          try {
            await api.uploadFile("/api/media/upload", imgPath, r2Key);
            imagesUploaded++;
            if (imagesUploaded % 10 === 0) console.error(`    ...${imagesUploaded} images uploaded`);
          } catch (e: unknown) {
            if (e instanceof Error && !e.message.includes("already exists")) {
              console.error(`    IMG ERROR ${r2Key}: ${e.message}`);
            }
          }
        } else {
          console.error(`    DRY-RUN IMG: ${r2Key}`);
        }
      }
    }

    // Rewrite relative image paths in body to R2 paths
    let processedBody = body.replace(
      /src=["']([^"'/][^"']*\.(jpg|jpeg|png|gif|webp))["']/gi,
      (match, filename) => `src="img/post/${entry}/${filename}"`,
    );

    const payload = {
      type: "post" as const,
      slug,
      title,
      body: processedBody,
      date,
      status: "published" as const,
      meta,
      tags,
    };

    if (dryRun) {
      console.error(`  DRY-RUN: post/${slug} (${title})`);
    } else {
      try {
        await api.post("/api/content", payload);
        imported++;
        console.error(`  OK: post/${slug}`);
      } catch (e: unknown) {
        if (e instanceof Error && e.message.includes("already exists")) {
          try {
            await api.put(`/api/content/post/${slug}`, {
              title, body: processedBody, date, status: "published", meta, tags,
            });
            imported++;
            console.error(`  UPDATED: post/${slug}`);
          } catch (e2) {
            console.error(`  ERROR ${slug}: ${e2}`);
          }
        } else {
          console.error(`  ERROR ${slug}: ${e}`);
        }
      }
    }
  }

  console.error(`\nImported ${imported} posts, uploaded ${imagesUploaded} images`);
}
