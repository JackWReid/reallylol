/** Commands for creating new content: post, note, photo, media. */

import { resolve } from "path";
import { existsSync, readdirSync } from "fs";
import { slugify } from "../lib/slugify";
import { todayDate, nowDatetime } from "../lib/dates";
import { writeContent, ensureDir } from "../lib/files";
import { generateFrontmatter } from "../lib/frontmatter";
import { ask, closePrompt } from "../lib/prompt";
import { run, commandExists } from "../lib/exec";
import { fzfSelect } from "../lib/picker";
import { ROOT, POST_DIR, NOTE_DIR, PHOTO_DIR, BOOKS_DIR, FILMS_DIR } from "../lib/paths";

// ─── new post ───────────────────────────────────────────────────────────────

export async function newPost(_args: string[]): Promise<void> {
  const slug = await ask("Slug: ");
  const title = await ask("Title: ");
  closePrompt();

  if (!slug) {
    console.error("Error: Slug cannot be empty");
    process.exit(1);
  }
  if (!title) {
    console.error("Error: Title cannot be empty");
    process.exit(1);
  }

  const date = todayDate();
  const mdPath = resolve(POST_DIR, `${date}-${slug}.md`);
  const fm = generateFrontmatter({ title, date, tags: ["journal"] });

  await writeContent(mdPath, fm + "\n\n");

  const proc = Bun.spawn(["vim", mdPath], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

// ─── new note ───────────────────────────────────────────────────────────────

export async function newNote(_args: string[]): Promise<void> {
  const note = await ask("Note: ");
  closePrompt();

  if (!note) {
    console.error("Error: Note cannot be empty");
    process.exit(1);
  }

  const slug = slugify(note) || "untitled";
  const dateOnly = todayDate();
  const dateTime = nowDatetime();
  const mdPath = resolve(NOTE_DIR, `${dateOnly}-${slug}.md`);
  const fm = generateFrontmatter({ title: note, date: dateTime });

  await writeContent(mdPath, fm + "\n");
}

// ─── new photo ──────────────────────────────────────────────────────────────

export async function newPhoto(args: string[]): Promise<void> {
  const imagePath = args[0];
  if (!imagePath) {
    console.error("Usage: bun scripts/cli.ts new photo path/to/photo.jpg");
    process.exit(1);
  }
  if (!existsSync(imagePath)) {
    console.error(`Error: File not found: ${imagePath}`);
    process.exit(1);
  }

  for (const tool of ["exiftool", "mogrify"]) {
    if (!(await commandExists(tool))) {
      console.error(
        `Error: ${tool} is required but not installed. Install with: brew install ${tool === "mogrify" ? "imagemagick" : tool}`,
      );
      process.exit(1);
    }
  }

  // Extract EXIF dates
  const creationDatetime = (
    await run(["exiftool", "-d", "%Y-%m-%dT%H:%M:%S", "-DateTimeOriginal", "-s3", imagePath])
  ).trim();
  const creationDate = (
    await run(["exiftool", "-d", "%Y-%m-%d", "-DateTimeOriginal", "-s3", imagePath])
  ).trim();

  if (!creationDate) {
    console.error("Error: Failed to extract the creation date from the EXIF data.");
    process.exit(1);
  }

  const slug = await ask("Slug: ");
  const title = await ask("Title: ");
  const location = await ask("Location: ");
  const tagsRaw = await ask("Tags [comma separated]: ");
  const altText = await ask("Alt text: ");
  closePrompt();

  if (!slug) {
    console.error("Error: Slug cannot be empty");
    process.exit(1);
  }
  if (!title) {
    console.error("Error: Title cannot be empty");
    process.exit(1);
  }

  const imgDest = resolve(ROOT, "assets/img/photo", `${creationDate}-${slug}.jpg`);
  const relImgPath = `img/photo/${creationDate}-${slug}.jpg`;
  const mdPath = resolve(PHOTO_DIR, `${creationDate}-${slug}.md`);

  // Copy and resize image
  await ensureDir(resolve(ROOT, "assets/img/photo"));
  await Bun.write(imgDest, Bun.file(imagePath));
  await run(["mogrify", "-quiet", "-format", "jpg", "-layers", "Dispose", "-resize", "1400>x1400>", "-quality", "100%", imgDest]);

  // Format tags
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Escape alt text for HTML
  const altEscaped = altText
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const fm = generateFrontmatter({
    title,
    date: creationDatetime,
    image: relImgPath,
    location,
    tags,
  });

  const body = `\n{{< image src="${relImgPath}" alt="${altEscaped}" >}}\n`;
  await writeContent(mdPath, fm + body);

  console.log(`Created photo post: ${mdPath}`);
}

// ─── new media ──────────────────────────────────────────────────────────────

interface MediaItem {
  type: "BOOK" | "MOVIE";
  dateUpdated: string;
  title: string;
  authorOrYear: string;
  imageUrl: string;
  baseSlug: string;
}

/**
 * Build an index of existing post slugs → next duplicate number.
 * Mirrors the bash version's post index logic.
 */
function buildPostIndex(): Map<string, number> {
  const index = new Map<string, number>();
  if (!existsSync(POST_DIR)) return index;

  for (const entry of readdirSync(POST_DIR)) {
    if (!entry.endsWith(".md")) continue;
    const filename = entry.slice(0, -3); // strip .md
    // Remove date prefix: YYYY-MM-DD-
    const slugPart = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "");
    // Check for numbered suffix: -N
    const numMatch = slugPart.match(/^(.+)-(\d+)$/);
    if (numMatch) {
      const base = numMatch[1];
      const num = parseInt(numMatch[2], 10);
      const current = index.get(base) ?? 0;
      index.set(base, Math.max(current, num + 1));
    } else {
      // Exact match — next number would be 1
      if (!index.has(slugPart)) {
        index.set(slugPart, 1);
      }
    }
  }
  return index;
}

function parseBooks(booksJson: string): MediaItem[] {
  if (!existsSync(booksJson)) return [];
  const data: Array<{
    date_updated: string;
    title: string;
    author?: string;
    image_url?: string;
  }> = JSON.parse(readFileSync(booksJson, "utf-8"));
  return data.map((b) => ({
    type: "BOOK" as const,
    dateUpdated: b.date_updated,
    title: b.title,
    authorOrYear: b.author ?? "Unknown",
    imageUrl: b.image_url ?? "",
    baseSlug: `read-${slugify(b.title)}-${slugify(b.author ?? "unknown")}`,
  }));
}

function parseMovies(moviesJson: string): MediaItem[] {
  if (!existsSync(moviesJson)) return [];
  const data: Array<{ date_updated: string; name: string; year?: string }> =
    JSON.parse(readFileSync(moviesJson, "utf-8"));
  return data.map((m) => ({
    type: "MOVIE" as const,
    dateUpdated: m.date_updated,
    title: m.name,
    authorOrYear: m.year ?? "",
    imageUrl: "",
    baseSlug: m.year
      ? `watched-${slugify(m.name)}-${m.year}`
      : `watched-${slugify(m.name)}`,
  }));
}

import { readFileSync } from "fs";

export async function newMedia(args: string[]): Promise<void> {
  const benchmarkMode = args.includes("--benchmark") || args.includes("-b");
  const timings: Array<{ label: string; ms: number }> = [];

  const time = <T>(label: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    timings.push({ label, ms: performance.now() - start });
    return result;
  };

  await ensureDir(POST_DIR);

  const postIndex = time("Build post index", () => buildPostIndex());

  const booksJson = resolve(BOOKS_DIR, "read.json");
  const moviesJson = resolve(FILMS_DIR, "watched.json");

  const books = time("Parse books JSON", () => parseBooks(booksJson));
  const movies = time("Parse movies JSON", () => parseMovies(moviesJson));

  if (books.length === 0 && movies.length === 0) {
    console.error("No books or movies found in data files.");
    process.exit(1);
  }

  // Combine and sort by date (most recent first)
  const allItems = [...books, ...movies].sort(
    (a, b) => b.dateUpdated.localeCompare(a.dateUpdated),
  );

  // Build fzf display lines
  const fzfLines = time(
    `Process ${allItems.length} items (slugify + lookup + format)`,
    () =>
      allItems.map((item) => {
        const existing = postIndex.get(item.baseSlug) ?? 0;
        const check = existing > 0 ? "✓" : " ";
        const emoji = item.type === "BOOK" ? "📚" : "🎬";
        const displayTitle =
          item.type === "BOOK"
            ? `${item.title} by ${item.authorOrYear}`
            : item.authorOrYear
              ? `${item.title} (${item.authorOrYear})`
              : item.title;
        const displayLine = `${check} ${emoji} ${displayTitle}`;
        return `${check}|${item.type}|${item.dateUpdated}|${item.title}|${item.authorOrYear}|${item.imageUrl}|${item.baseSlug}|${displayLine}`;
      }),
  );

  if (benchmarkMode) {
    const totalMs = timings.reduce((s, t) => s + t.ms, 0);
    console.log("");
    console.log("=========================================");
    console.log("BENCHMARK RESULTS");
    console.log("=========================================");
    console.log("");
    for (const t of timings) {
      const formatted = t.ms < 1000 ? `${Math.round(t.ms)}ms` : `${(t.ms / 1000).toFixed(2)}s`;
      console.log(`  ${t.label.padEnd(50)} ${formatted}`);
    }
    console.log("");
    const formatted = totalMs < 1000 ? `${Math.round(totalMs)}ms` : `${(totalMs / 1000).toFixed(2)}s`;
    console.log(`  ${"Total time:".padEnd(50)} ${formatted}`);
    console.log("");
    console.log("Summary:");
    console.log(`  - Books: ${books.length}`);
    console.log(`  - Movies: ${movies.length}`);
    console.log(`  - Total items processed: ${allItems.length}`);
    console.log(`  - Post index entries: ${postIndex.size}`);
    console.log("");
    return;
  }

  // Present in fzf
  const selected = await fzfSelect(fzfLines, {
    delimiter: "|",
    withNth: "8",
    header: "[ENTER] Select media to log | ✓ = already logged",
    statusFn: (line) => {
      const p = line.split("|");
      return `Type: ${p[1]} | Date: ${p[2]}`;
    },
  });

  if (!selected) {
    console.log("No selection made.");
    return;
  }

  // Parse selection
  const parts = selected.split("|");
  const type = parts[1] as "BOOK" | "MOVIE";
  const date = parts[2];
  const title = parts[3];
  const authorOrYear = parts[4];
  const imageUrl = parts[5];
  const baseSlug = parts[6];

  // Determine duplicate numbering
  const existing = postIndex.get(baseSlug) ?? 0;
  const finalSlug = existing > 0 ? `${baseSlug}-${existing}` : baseSlug;

  // Build frontmatter
  const postTitle =
    type === "BOOK"
      ? `${title} by ${authorOrYear}`
      : authorOrYear
        ? `${title} (${authorOrYear})`
        : title;

  const fields: Record<string, string | string[] | number | undefined> = {
    title: postTitle,
    slug: finalSlug,
    date,
    tags: type === "BOOK" ? ["medialog", "readbook"] : ["medialog", "watchedmovie"],
  };

  if (type === "BOOK") {
    fields.book_author = authorOrYear;
  } else if (authorOrYear) {
    fields.movie_released = authorOrYear;
  }

  if (imageUrl) {
    fields.media_image = imageUrl;
  }

  fields.rating = 0;

  const fm = generateFrontmatter(fields);
  const postPath = resolve(POST_DIR, `${date}-${finalSlug}.md`);
  await writeContent(postPath, fm + "\n\n");

  // Open in vim
  const proc = Bun.spawn(["vim", postPath], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}
