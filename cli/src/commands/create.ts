import { writeFileSync, mkdirSync } from "fs";
import { ask, close } from "../lib/prompts";
import { upload } from "../lib/r2";
import { extname } from "path";

const CONTENT_DIR = "site/src/content";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${JSON.stringify(item)}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

interface CreateOptions {
  title?: string;
  tags?: string;
  date?: string;
  body?: string;
  slug?: string;
  location?: string;
  link?: string;
  subtitle?: string;
}

export async function create(type: string, args: string[], opts: CreateOptions) {
  const isInteractive = !opts.title;
  const validTypes = ["post", "photo", "note", "highlight"];

  if (!validTypes.includes(type)) {
    if (isInteractive) {
      type = await ask(`Type (${validTypes.join("|")})`);
      if (!validTypes.includes(type)) {
        console.error(`Unknown type: ${type}. Use: post, photo, note, highlight`);
        process.exit(1);
      }
    } else {
      console.error(`Unknown type: ${type}. Use: post, photo, note, highlight`);
      process.exit(1);
    }
  }

  let title = opts.title ?? "";
  let date = opts.date ?? todayStr();
  let tags: string[] = opts.tags ? opts.tags.split(",").map((t) => t.trim()) : [];
  let body = opts.body ?? "";
  let slug = opts.slug ?? "";

  if (isInteractive) {
    title = await ask("Title");
    date = await ask("Date", todayStr());
    const tagsStr = await ask("Tags (comma-separated)", "");
    tags = tagsStr ? tagsStr.split(",").map((t) => t.trim()) : [];
  }

  if (!slug) slug = slugify(title);
  const filename = `${date}-${slug}.md`;

  if (type === "photo") {
    let imagePath = args[0];
    if (!imagePath) {
      if (isInteractive) {
        imagePath = await ask("Image file path");
      } else {
        console.error("Usage: cli create photo <image-file> [options]");
        process.exit(1);
      }
    }

    let location = opts.location ?? "";
    if (isInteractive) {
      location = await ask("Location", "");
    }

    const ext = extname(imagePath).toLowerCase();
    const r2Key = `img/photo/${slug}${ext}`;
    console.log(`Uploading ${imagePath} to R2 as ${r2Key}...`);
    await upload(imagePath, r2Key);

    const frontmatter = generateFrontmatter({
      title,
      date,
      image: r2Key,
      location: location || undefined,
      tags,
    });
    const dir = `${CONTENT_DIR}/photo`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/${filename}`, `${frontmatter}\n`, "utf-8");
    console.log(`Created: ${dir}/${filename}`);

  } else if (type === "post") {
    let subtitle = opts.subtitle ?? "";
    if (isInteractive) {
      subtitle = await ask("Subtitle", "");
      body = await ask("Body (or leave empty to edit later)", "");
    }

    const frontmatter = generateFrontmatter({
      title,
      date,
      subtitle: subtitle || undefined,
      tags,
    });
    const dir = `${CONTENT_DIR}/blog`;
    mkdirSync(dir, { recursive: true });
    const content = body ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
    writeFileSync(`${dir}/${filename}`, content, "utf-8");
    console.log(`Created: ${dir}/${filename}`);

  } else if (type === "note") {
    if (isInteractive && !body) {
      body = await ask("Body", "");
    }
    const frontmatter = generateFrontmatter({ title, date });
    const dir = `${CONTENT_DIR}/note`;
    mkdirSync(dir, { recursive: true });
    const content = body ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
    writeFileSync(`${dir}/${filename}`, content, "utf-8");
    console.log(`Created: ${dir}/${filename}`);

  } else if (type === "highlight") {
    let link = opts.link ?? "";
    if (isInteractive) {
      link = await ask("Source URL (required)");
      body = await ask("Quote (use > prefix)", "");
    }
    if (!link) {
      console.error("Error: highlights require a source URL (--link)");
      process.exit(1);
    }
    const frontmatter = generateFrontmatter({ title, date, link, tags });
    const dir = `${CONTENT_DIR}/highlight`;
    mkdirSync(dir, { recursive: true });
    const content = body ? `${frontmatter}\n\n${body}\n` : `${frontmatter}\n`;
    writeFileSync(`${dir}/${filename}`, content, "utf-8");
    console.log(`Created: ${dir}/${filename}`);

  }

  if (isInteractive) close();
}
