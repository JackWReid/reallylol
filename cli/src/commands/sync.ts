import { CmsApi } from "../lib/api";

const api = new CmsApi();

function parseFlags(args: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
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
  return flags;
}

async function readStdin(): Promise<string> {
  const chunks: Uint8Array[] = [];
  const reader = Bun.stdin.stream().getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// --- Transform functions (from scripts/commands/sync.ts) ---

interface CoverBookEntry {
  book: {
    title: string;
    slug: string;
    authors: string[];
    imageUrl?: string | null;
  };
  dateUpdated: string;
}

function transformCoverBook(raw: CoverBookEntry) {
  return {
    title: raw.book.title,
    author: raw.book.authors?.join(", ") ?? "Unknown",
    date_updated: raw.dateUpdated ?? "",
    image_url: raw.book.imageUrl ?? "",
    hardcover_url: `https://hardcover.app/books/${raw.book.slug}`,
  };
}

interface CurtainFilmEntry {
  film: {
    title: string;
    year: number | null;
  };
  watchedDate?: string | null;
  addedDate?: string | null;
}

function transformCurtainFilm(
  entry: CurtainFilmEntry,
  dateField: "watchedDate" | "addedDate",
) {
  return {
    name: entry.film.title,
    year: String(entry.film.year ?? ""),
    date_updated: entry[dateField] ?? "",
  };
}

// --- Commands ---

export async function syncCommand(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case "books":
      return syncBooks(rest);
    case "films":
      return syncFilms(rest);
    case "links":
      return syncLinks(rest);
    default:
      console.error("Usage: cms sync <books|films|links> [options]");
      console.error("");
      console.error("Examples:");
      console.error(
        "  cover books --shelf read --json | cms sync books --shelf read",
      );
      console.error(
        "  curtain diary --json | cms sync films --list watched",
      );
      console.error("  cms sync links");
      process.exit(1);
  }
}

async function syncBooks(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const shelf = flags.get("shelf");
  if (!shelf) {
    console.error(
      "Usage: cover books --shelf <shelf> --json | cms sync books --shelf <shelf>",
    );
    console.error("Shelves: read, reading, toread");
    process.exit(1);
  }

  console.error(`Reading books JSON from stdin for shelf: ${shelf}...`);
  const input = await readStdin();
  const raw: CoverBookEntry[] = JSON.parse(input.trim() || "[]");
  const items = raw.map(transformCoverBook);

  const result = await api.post("/api/sync/books", { shelf, items });
  console.log(JSON.stringify(result, null, 2));
}

async function syncFilms(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const list = flags.get("list");
  if (!list) {
    console.error(
      "Usage: curtain diary --json | cms sync films --list <list>",
    );
    console.error("Lists: watched, towatch");
    process.exit(1);
  }

  const dateField = list === "towatch" ? "addedDate" : "watchedDate";

  console.error(`Reading films JSON from stdin for list: ${list}...`);
  const input = await readStdin();
  const raw: CurtainFilmEntry[] = JSON.parse(input.trim() || "[]");
  const items = raw.map((e) => transformCurtainFilm(e, dateField as "watchedDate" | "addedDate"));

  const result = await api.post("/api/sync/films", { list, items });
  console.log(JSON.stringify(result, null, 2));
}

async function syncLinks(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const tag = flags.get("tag") ?? "toblog";

  // Read Raindrop token
  const tokenFile = `${process.env.HOME}/Developer/reallylol/creds/raindrop-token`;
  let token: string | undefined;

  const file = Bun.file(tokenFile);
  if (await file.exists()) {
    token = (await file.text()).trim();
  }
  if (!token) {
    token = process.env.RAINDROP_ACCESS_TOKEN?.trim();
  }
  if (!token) {
    console.error("Error: Raindrop access token not found");
    console.error(`  Checked: ${tokenFile}`);
    console.error("  Checked: RAINDROP_ACCESS_TOKEN env var");
    process.exit(1);
  }

  console.error(`Fetching links with tag: ${tag}...`);

  const perPage = 50;
  const allItems: Array<{
    title: string;
    url: string;
    date: string;
    excerpt: string | null;
    cover: string | null;
    tags: string[];
  }> = [];
  let page = 0;

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
      console.error(`Error: API request failed with HTTP ${resp.status}`);
      process.exit(1);
    }

    const data = (await resp.json()) as { items?: Array<Record<string, unknown>> };
    const items = data.items ?? [];
    if (items.length === 0) break;

    for (const item of items) {
      allItems.push({
        title: String(item.title || item.domain || "Untitled"),
        url: String(item.link ?? ""),
        date: item.created ? String(item.created).split("T")[0] : "",
        excerpt: item.excerpt ? String(item.excerpt) : null,
        cover: item.cover ? String(item.cover) : null,
        tags: (item.tags as string[]) ?? [],
      });
    }

    if (items.length < perPage) break;
    page++;
  }

  allItems.sort((a, b) => b.date.localeCompare(a.date));

  const result = await api.post("/api/sync/links", { items: allItems });
  console.log(JSON.stringify(result, null, 2));
}
