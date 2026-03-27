/** Sync commands: books, films, links, photos, all. */

import { resolve } from "path";
import { existsSync, readdirSync, readFileSync } from "fs";
import { run, commandExists } from "../lib/exec";
import { writeCompactJson } from "../lib/json";
import { ensureDir } from "../lib/files";
import { parseTags } from "../lib/frontmatter";
import { ROOT, DATA_DIR, BOOKS_DIR, FILMS_DIR, PHOTO_DIR, CREDS_DIR } from "../lib/paths";

// ─── Books ──────────────────────────────────────────────────────────────────

export async function syncBooks(_args: string[]): Promise<void> {
  if (!(await commandExists("cover"))) {
    console.error("Error: cover CLI not found. Install from https://github.com/jackreid/cover");
    process.exit(1);
  }
  if (!process.env.HARDCOVER_API_KEY) {
    console.error("Error: HARDCOVER_API_KEY environment variable not set");
    process.exit(1);
  }

  await ensureDir(BOOKS_DIR);

  for (const shelf of ["toread", "reading", "read"]) {
    console.log(`  Fetching ${shelf}...`);
    const output = await run(["cover", "list", shelf, "--blog"]);
    const trimmed = output.trim();
    const data = trimmed.includes("No books found") ? [] : JSON.parse(trimmed);
    await writeCompactJson(data, resolve(BOOKS_DIR, `${shelf}.json`));
    console.log(`  ${shelf}.json (${data.length} books)`);
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

async function fetchRssDiary(username: string): Promise<Film[]> {
  const url = `https://letterboxd.com/${username}/rss/`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!resp.ok) throw new Error(`Letterboxd RSS returned ${resp.status}`);
  const xml = await resp.text();

  // Simple regex parsing — the RSS structure is flat and stable
  const entries: Film[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(
      /<letterboxd:filmTitle>(.*?)<\/letterboxd:filmTitle>/,
    );
    if (!titleMatch) continue;
    const yearMatch = block.match(
      /<letterboxd:filmYear>(.*?)<\/letterboxd:filmYear>/,
    );
    const dateMatch = block.match(
      /<letterboxd:watchedDate>(.*?)<\/letterboxd:watchedDate>/,
    );
    if (!dateMatch) continue;

    entries.push({
      name: titleMatch[1],
      year: yearMatch?.[1] ?? "",
      date_updated: dateMatch[1],
    });
  }

  return entries;
}

async function scrapeWatchlist(username: string): Promise<Film[]> {
  const films: Film[] = [];
  let page = 1;

  while (true) {
    const url = `https://letterboxd.com/${username}/watchlist/page/${page}/`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (resp.status === 404) break;
    if (!resp.ok) throw new Error(`Letterboxd returned ${resp.status}`);

    const html = await resp.text();
    const matches = [...html.matchAll(/data-item-name="([^"]+)"/g)];
    if (matches.length === 0) break;

    for (const m of matches) {
      const raw = m[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'");

      const idx = raw.lastIndexOf(" (");
      if (idx !== -1 && raw.endsWith(")")) {
        films.push({ name: raw.slice(0, idx), year: raw.slice(idx + 2, -1) });
      } else {
        films.push({ name: raw, year: "" });
      }
    }

    page++;
  }

  return films;
}

export async function syncFilms(args: string[]): Promise<void> {
  const username =
    args.find((a) => a.startsWith("--username="))?.split("=")[1] ??
    LETTERBOXD_DEFAULT_USER;

  await ensureDir(FILMS_DIR);
  const today = new Date().toISOString().slice(0, 10);

  // Watchlist
  console.log(`  Scraping watchlist for ${username}...`);
  const scraped = await scrapeWatchlist(username);
  const existingTowatch = loadJson<Film>(resolve(FILMS_DIR, "towatch.json"));
  const existingDates = new Map(
    existingTowatch.map((f) => [`${f.name}|${f.year}`, f.date_updated]),
  );
  const towatch = scraped
    .map((f) => ({
      name: f.name,
      year: f.year,
      date_updated: existingDates.get(`${f.name}|${f.year}`) ?? today,
    }))
    .sort((a, b) => b.date_updated!.localeCompare(a.date_updated!));
  await writeCompactJson(towatch, resolve(FILMS_DIR, "towatch.json"));

  // Diary (watched)
  console.log(`  Fetching RSS diary for ${username}...`);
  const rssEntries = await fetchRssDiary(username);
  const existingWatched = loadJson<Film>(resolve(FILMS_DIR, "watched.json"));
  const seen = new Map<string, Film>();
  for (const f of existingWatched) seen.set(`${f.name}|${f.year}`, f);
  for (const f of rssEntries) seen.set(`${f.name}|${f.year}`, f);
  const watched = [...seen.values()].sort((a, b) =>
    (b.date_updated ?? "").localeCompare(a.date_updated ?? ""),
  );
  await writeCompactJson(watched, resolve(FILMS_DIR, "watched.json"));

  console.log("Films sync complete:");
  console.log(`  towatch.json (${towatch.length} films)`);
  console.log(`  watched.json (${watched.length} films)`);
}

// ─── Links ──────────────────────────────────────────────────────────────────

export async function syncLinks(args: string[]): Promise<void> {
  const tag =
    args.find((a) => a.startsWith("--tag="))?.split("=")[1] ??
    process.env.RAINDROP_TAG ??
    "toblog";

  // Find token
  let token: string | undefined;
  const tokenFile = resolve(CREDS_DIR, "raindrop-token");

  if (existsSync(tokenFile)) {
    token = readFileSync(tokenFile, "utf-8").trim();
    if (token) console.log(`  Using token from creds/raindrop-token`);
  }

  if (!token) {
    token = process.env.RAINDROP_ACCESS_TOKEN?.trim();
    if (token) console.log("  Using token from RAINDROP_ACCESS_TOKEN");
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

  await ensureDir(DATA_DIR);
  await writeCompactJson(allItems, resolve(DATA_DIR, "links.json"));

  console.log("Links sync complete:");
  console.log(`  links.json (${allItems.length} links)`);
}

// ─── Photos ─────────────────────────────────────────────────────────────────

export async function syncPhotos(_args: string[]): Promise<void> {
  const configPath = resolve(DATA_DIR, "content_config.json");
  if (!existsSync(configPath)) {
    console.error(`Error: data/content_config.json not found`);
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  const excludeTags = new Set(
    (config.exclude_tags ?? []).map((t: string) => t.toLowerCase()),
  );

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

  await writeCompactJson(eligible, resolve(DATA_DIR, "random_photos.json"));

  console.log("Photos sync complete:");
  console.log(`  random_photos.json (${eligible.length} eligible photos)`);
}

// ─── All ────────────────────────────────────────────────────────────────────

export async function syncAll(args: string[]): Promise<void> {
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
