import { writeFileSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

const DATA_DIR = "site/src/data";

interface BookInput {
  book: { title: string; slug: string; authors: string[]; imageUrl: string | null };
  finishedAt: string | null;
  dateAdded: string | null;
  dateUpdated: string | null;
}
export async function syncBooks(shelf: string) {
  const input = runCover(shelf);
  const rawItems = JSON.parse(input) as BookInput[];

  const today = new Date().toISOString().slice(0, 10);
  const books = rawItems.map((b) => ({
    title: b.book.title,
    author: b.book.authors.join(", "),
    date_updated: b.finishedAt ?? b.dateUpdated ?? b.dateAdded ?? today,
    image_url: b.book.imageUrl ?? null,
    hardcover_url: `https://hardcover.app/books/${b.book.slug}`,
  }));

  const outPath = `${DATA_DIR}/books-${shelf}.json`;
  writeFileSync(outPath, JSON.stringify(books, null, 2), "utf-8");
  console.log(`Wrote ${books.length} books to ${outPath}`);
}

interface FilmOutput { name: string; year: string | null; date_updated: string }

export async function syncFilms(list: string, fromPath: string) {
  const entry = list === "towatch" ? "watchlist.csv" : "diary.csv";
  const csv = readCsvFromExport(fromPath, entry);
  const films = parseLetterboxdCsv(csv);

  const outPath = `${DATA_DIR}/films-${list}.json`;
  writeFileSync(outPath, JSON.stringify(films, null, 2), "utf-8");
  console.log(`Wrote ${films.length} films to ${outPath}`);
}

function readCsvFromExport(path: string, entry: string): string {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    return readFileSync(join(path, entry), "utf-8");
  }
  if (path.endsWith(".csv")) {
    return readFileSync(path, "utf-8");
  }
  if (path.endsWith(".zip")) {
    const result = spawnSync("unzip", ["-p", path, entry], { encoding: "utf-8" });
    if (result.status !== 0) {
      throw new Error(`Failed to extract ${entry} from ${path}: ${result.stderr}`);
    }
    return result.stdout;
  }
  throw new Error(`Unsupported export path: ${path} (expected .zip, .csv, or directory)`);
}

function parseLetterboxdCsv(csv: string): FilmOutput[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];
  const headers = rows[0];
  const dateIdx = headers.indexOf("Date");
  const nameIdx = headers.indexOf("Name");
  const yearIdx = headers.indexOf("Year");
  if (nameIdx === -1 || dateIdx === -1) {
    throw new Error(`CSV missing required headers; got: ${headers.join(", ")}`);
  }
  return rows.slice(1)
    .filter((r) => r[nameIdx])
    .map((r) => ({
      name: r[nameIdx],
      year: r[yearIdx] || null,
      date_updated: r[dateIdx],
    }));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += c; }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export async function syncLinks() {
  const token = process.env.RAINDROP_ACCESS_TOKEN ??
    readFileSync("creds/raindrop-token", "utf-8").trim();

  const links: Array<{ title: string; url: string; date: string; excerpt: string | null; cover: string | null; tags: string[] }> = [];
  let page = 0;
  const perPage = 50;

  while (true) {
    const res = await fetch(
      `https://api.raindrop.io/rest/v1/raindrops/0?search=%23toblog&sort=-created&perpage=${perPage}&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Raindrop API ${res.status}`);
    const data = await res.json() as { items: Array<{ title: string; link: string; created: string; excerpt: string; cover: string; tags: string[] }> };
    if (data.items.length === 0) break;

    for (const item of data.items) {
      links.push({
        title: item.title,
        url: item.link,
        date: item.created.slice(0, 10),
        excerpt: item.excerpt || null,
        cover: item.cover || null,
        tags: item.tags,
      });
    }
    if (data.items.length < perPage) break;
    page++;
  }

  const outPath = `${DATA_DIR}/links.json`;
  writeFileSync(outPath, JSON.stringify(links, null, 2), "utf-8");
  console.log(`Wrote ${links.length} links to ${outPath}`);
}

function runCover(shelf: string): string {
  console.log(`Running: cover books --shelf ${shelf} --json --per-page 2000`);
  const result = spawnSync(
    "cover",
    ["books", "--shelf", shelf, "--json", "--per-page", "2000"],
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.error) throw new Error(`Failed to run cover: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`cover exited ${result.status}: ${result.stderr}`);
  return result.stdout;
}

