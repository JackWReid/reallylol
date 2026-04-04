/**
 * Sync commands: books, films, links, photos, all.
 *
 * TODO 1: Replace `process.exit()` usage in sync commands with thrown errors; keep exit handling centralised in `scripts/cli.ts`.
 * TODO 3: Add network resilience helpers (request timeout + retries with exponential backoff for 429/5xx responses).
 * TODO 4: Add lightweight runtime validation for external API JSON payloads before use.
 * TODO 5: Unify and document CLI flags across sync commands (support `--flag value`, plus `--verbose`, `--dry-run`, optional output override for testing).
 * TODO 6: ~~Make scraping/parsing more robust~~ -- Done. Replaced regex-based HTML/RSS scraping with `cover books --json` and `curtain diary/--json` + `curtain watchlist --json`.
 * TODO 7: Improve dedupe key strategy beyond `${name}|${year}` to avoid collision edge cases.
 * TODO 8: Return structured per-command summary stats and print a consolidated final summary in `syncAll`.
 */

import { resolve } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";
import { run, commandExists } from "../lib/exec";
import { writeCompactJson } from "../lib/json";
import { ensureDir } from "../lib/files";
import { parseTags } from "../lib/frontmatter";
import {
  ROOT,
  DATA_DIR,
  BOOKS_DIR,
  FILMS_DIR,
  PHOTO_DIR,
  CREDS_DIR,
} from "../lib/paths";
import { parseFlags, getFlagValue, getFlagBoolean } from "../lib/flags";

// ─── Books ──────────────────────────────────────────────────────────────────

interface BookRow {
  title: string;
  author: string;
  date_updated: string;
  image_url: string;
  hardcover_url: string;
}

function transformCoverBook(raw: unknown): BookRow {
  const entry = raw as {
    book: {
      title: string;
      slug: string;
      authors: string[];
      imageUrl?: string | null;
    };
    dateUpdated: string;
  };
  return {
    title: entry.book.title,
    author: entry.book.authors?.join(", ") ?? "Unknown",
    date_updated: entry.dateUpdated ?? "",
    image_url: entry.book.imageUrl ?? "",
    hardcover_url: `https://hardcover.app/books/${entry.book.slug}`,
  };
}

export async function syncBooks(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const verbose = getFlagBoolean(flags, "verbose");
  const dryRun = getFlagBoolean(flags, "dry-run");

  if (!(await commandExists("cover"))) {
    console.error(
      "Error: cover CLI not found. Install from https://github.com/jackreid/cover",
    );
    process.exit(1);
  }
  if (!process.env.HARDCOVER_API_KEY) {
    console.error("Error: HARDCOVER_API_KEY environment variable not set");
    process.exit(1);
  }

  if (dryRun) {
    console.log("[dry-run] Skipping directory creation");
  } else {
    await ensureDir(BOOKS_DIR);
  }

  for (const shelf of ["toread", "reading", "read"]) {
    console.log(`  Fetching ${shelf}...`);
    const output = await run([
      "cover",
      "books",
      "--shelf",
      shelf,
      "--per-page",
      "2000",
      "--json",
    ]);
    const trimmed = output.trim();
    const rawBooks: unknown[] = trimmed === "[]" ? [] : JSON.parse(trimmed);
    const books = rawBooks.map(transformCoverBook);

    const outputPath = resolve(BOOKS_DIR, `${shelf}.json`);
    if (dryRun) {
      console.log(`[dry-run] Would write ${outputPath} (${books.length} books)`);
    } else {
      await writeCompactJson(books, outputPath);
      console.log(`  ${shelf}.json (${books.length} books)`);
    }

    if (verbose) {
      console.log(`[verbose] Processed shelf: ${shelf}, count: ${books.length}`);
    }
  }

  console.log("Books sync complete.");
}

// ─── Films ──────────────────────────────────────────────────────────────────

const LETTERBOXD_DEFAULT_USER = "jackreid";

interface Film {
  name: string;
  year: string;
  date_updated?: string;
}

function loadJson<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

interface CurtainFilmEntry {
  film: {
    title: string;
    year: number | null;
  };
  watchedDate?: string | null;
  addedDate?: string | null;
}

function curtainEntryToFilm(
  entry: CurtainFilmEntry,
  dateField: string,
): Film {
  const year = entry.film.year ?? "";
  return {
    name: entry.film.title,
    year: String(year),
    date_updated: entry[dateField as keyof CurtainFilmEntry] as string | undefined,
  };
}

export async function syncFilms(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const verbose = getFlagBoolean(flags, "verbose");
  const dryRun = getFlagBoolean(flags, "dry-run");
  const username = getFlagValue(
    flags,
    "username",
    undefined,
    LETTERBOXD_DEFAULT_USER,
  );
  const outputOverride = getFlagValue(flags, "output");

  if (verbose) {
    console.log(`[verbose] Using Letterboxd username: ${username}`);
  }

  if (!(await commandExists("curtain"))) {
    console.error(
      "Error: curtain CLI not found. Install from https://github.com/jackreid/curtain",
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log("[dry-run] Skipping directory creation");
  } else {
    await ensureDir(FILMS_DIR);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Watchlist
  console.log(`  Fetching watchlist for ${username}...`);
  const wlOutput = await run(["curtain", "watchlist", "--json", "--per-page", "2000", username]);
  const rawWatchlist: CurtainFilmEntry[] = JSON.parse(wlOutput.trim() || "[]");

  const existingTowatch = loadJson<Film>(
    outputOverride ?? resolve(FILMS_DIR, "towatch.json"),
  );
  const existingDates = new Map(
    existingTowatch.map((f) => [`${f.name}|${f.year}`, f.date_updated]),
  );
  const towatch = rawWatchlist
    .map((e) => curtainEntryToFilm(e, "addedDate"))
    .filter((f) => f.name)
    .map((f) => ({
      ...f,
      date_updated: existingDates.get(`${f.name}|${f.year}`) ?? today,
    }))
    .sort((a, b) => b.date_updated!.localeCompare(a.date_updated!));

  const towatchPath: string =
    outputOverride ?? resolve(FILMS_DIR, "towatch.json");
  if (dryRun) {
    console.log(
      `[dry-run] Would write ${towatchPath} (${towatch.length} films)`,
    );
  } else {
    await writeCompactJson(towatch, towatchPath);
  }

  // Diary (watched)
  console.log(`  Fetching diary for ${username}...`);
  const diaryOutput = await run(["curtain", "diary", "--json", "--per-page", "2000", username]);
  const rawDiary: CurtainFilmEntry[] = JSON.parse(diaryOutput.trim() || "[]");

  const watchedPath: string =
    outputOverride?.replace("towatch", "watched") ??
    resolve(FILMS_DIR, "watched.json");
  const existingWatched = loadJson<Film>(watchedPath);
  const seen = new Map<string, Film>();
  for (const f of existingWatched) seen.set(`${f.name}|${f.year}`, f);
  for (const f of rawDiary)
    seen.set(`${f.name}|${f.year}`, curtainEntryToFilm(f, "watchedDate"));
  const watched = [...seen.values()].sort((a, b) =>
    (b.date_updated ?? "").localeCompare(a.date_updated ?? ""),
  );

  if (dryRun) {
    console.log(
      `[dry-run] Would write ${watchedPath} (${watched.length} films)`,
    );
  } else {
    await writeCompactJson(watched, watchedPath);
  }

  console.log("Films sync complete:");
  console.log(`  towatch.json (${towatch.length} films)`);
  console.log(`  watched.json (${watched.length} films)`);
}

// ─── Links ──────────────────────────────────────────────────────────────────

export async function syncLinks(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const verbose = getFlagBoolean(flags, "verbose");
  const dryRun = getFlagBoolean(flags, "dry-run");
  const tag = getFlagValue(flags, "tag", "RAINDROP_TAG", "toblog");
  const outputOverride = getFlagValue(flags, "output");

  if (verbose) {
    console.log(`[verbose] Syncing links with tag: ${tag}`);
  }

  // Find token
  let token: string | undefined;
  const tokenFile = resolve(CREDS_DIR, "raindrop-token");

  if (existsSync(tokenFile)) {
    token = readFileSync(tokenFile, "utf-8").trim();
    if (token) {
      console.log(`  Using token from creds/raindrop-token`);
      if (verbose) console.log(`[verbose] Token loaded from file`);
    }
  }

  if (!token) {
    token = process.env.RAINDROP_ACCESS_TOKEN?.trim();
    if (token) {
      console.log("  Using token from RAINDROP_ACCESS_TOKEN");
      if (verbose) console.log(`[verbose] Token loaded from environment`);
    }
  }

  if (!token) {
    console.error("Error: Raindrop access token not found");
    console.error(`  Checked: ${tokenFile}`);
    console.error("  Checked: RAINDROP_ACCESS_TOKEN env var");
    process.exit(1);
  }

  const perPage = 50;
  const allItems: Array<{
    title: string;
    url: string;
    date: string;
    excerpt: string;
    tags: string[];
    cover: string;
  }> = [];
  let page = 0;

  console.log(`  Fetching links with tag: ${tag}...`);

  while (true) {
    const encodedTag = encodeURIComponent(tag);
    const url = `https://api.raindrop.io/rest/v1/raindrops/0?search=%23${encodedTag}&page=${page}&perpage=${perPage}`;

    if (verbose) {
      console.log(`[verbose] Fetching page ${page + 1}`);
    }

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      if (resp.status === 401) {
        console.error("Error: Authentication failed (401). Check your token.");
      } else if (resp.status === 429) {
        console.error("Error: Rate limit exceeded (429). Try again later.");
      } else {
        console.error(`Error: API request failed with HTTP ${resp.status}`);
      }
      process.exit(1);
    }

    const data = await resp.json();
    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      allItems.push({
        title: item.title || item.domain || "Untitled",
        url: item.link ?? "",
        date: item.created ? item.created.split("T")[0] : "",
        excerpt: item.excerpt ?? "",
        tags: item.tags ?? [],
        cover: item.cover ?? "",
      });
    }

    if (items.length < perPage) break;
    page++;
  }

  allItems.sort((a, b) => b.date.localeCompare(a.date));

  const outputPath: string = outputOverride ?? resolve(DATA_DIR, "links.json");

  if (dryRun) {
    console.log(
      `[dry-run] Would write ${outputPath} (${allItems.length} links)`,
    );
  } else {
    await ensureDir(DATA_DIR);
    await writeCompactJson(allItems, outputPath);
  }

  console.log("Links sync complete:");
  console.log(`  links.json (${allItems.length} links)`);
}

// ─── Photos ─────────────────────────────────────────────────────────────────

export async function syncPhotos(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const verbose = getFlagBoolean(flags, "verbose");
  const dryRun = getFlagBoolean(flags, "dry-run");
  const outputOverride = getFlagValue(flags, "output");

  const configPath = resolve(DATA_DIR, "content_config.json");
  if (!existsSync(configPath)) {
    console.error(`Error: data/content_config.json not found`);
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const excludeTags = new Set(
    (config.exclude_tags ?? []).map((t: string) => t.toLowerCase()),
  );

  if (verbose) {
    console.log(
      `[verbose] Exclude tags: ${Array.from(excludeTags).join(", ")}`,
    );
  }

  if (!existsSync(PHOTO_DIR)) {
    console.error("Error: content/photo/ not found");
    process.exit(1);
  }

  const photoFiles = readdirSync(PHOTO_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  if (photoFiles.length === 0) {
    console.error("No photo files found in content/photo/");
    process.exit(1);
  }

  const eligible: Array<{ path: string }> = [];

  for (let i = 0; i < photoFiles.length; i++) {
    if ((i + 1) % 100 === 0 || i + 1 === photoFiles.length) {
      process.stdout.write(
        `\r  Scanning photos: ${i + 1}/${photoFiles.length}`,
      );
    }

    const text = readFileSync(resolve(PHOTO_DIR, photoFiles[i]), "utf-8");
    if (!text.startsWith("---")) continue;
    const parts = text.split("---", 3);
    if (parts.length < 3) continue;

    const tags = parseTags(parts[1]);
    const normalised = new Set(tags.map((t) => t.toLowerCase()));
    const hasExcluded = [...normalised].some((t) => excludeTags.has(t));

    if (!hasExcluded) {
      const stem = photoFiles[i].replace(/\.md$/, "");
      eligible.push({ path: `photo/${stem}` });
    }
  }

  console.log(); // newline after progress

  const outputPath = outputOverride ?? resolve(DATA_DIR, "random_photos.json");

  if (dryRun) {
    console.log(
      `[dry-run] Would write ${outputPath} (${eligible.length} eligible photos)`,
    );
  } else {
    await writeCompactJson(eligible, outputPath);
  }

  console.log("Photos sync complete:");
  console.log(`  random_photos.json (${eligible.length} eligible photos)`);
}

// ─── All ────────────────────────────────────────────────────────────────────

export async function syncAll(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  if (getFlagBoolean(flags, "verbose")) {
    console.log("[verbose] Running all sync commands");
  }

  console.log("=== Books ===");
  await syncBooks(args);
  console.log();
  console.log("=== Links ===");
  await syncLinks(args);
  console.log();
  console.log("=== Films ===");
  await syncFilms(args);
  console.log();
  console.log("=== Photos ===");
  await syncPhotos(args);
}
