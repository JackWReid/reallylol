import { writeFileSync, readFileSync } from "fs";

const DATA_DIR = "site/src/data";

interface BookInput { title: string; author: string; date_finished?: string; date_updated?: string; image?: string; url?: string; }
interface FilmInput { name: string; year?: string | number; date?: string; date_updated?: string; }

export async function syncBooks(shelf: string) {
  const input = await readStdin();
  const rawItems = JSON.parse(input) as BookInput[];

  const books = rawItems.map((b) => ({
    title: b.title,
    author: b.author,
    date_updated: b.date_finished ?? b.date_updated ?? new Date().toISOString().slice(0, 10),
    image_url: b.image ?? null,
    hardcover_url: b.url ?? null,
  }));

  const outPath = `${DATA_DIR}/books-${shelf}.json`;
  writeFileSync(outPath, JSON.stringify(books, null, 2), "utf-8");
  console.log(`Wrote ${books.length} books to ${outPath}`);
}

export async function syncFilms(list: string) {
  const input = await readStdin();
  const rawItems = JSON.parse(input) as FilmInput[];

  const films = rawItems.map((f) => ({
    name: f.name,
    year: f.year ? String(f.year) : null,
    date_updated: f.date ?? f.date_updated ?? new Date().toISOString().slice(0, 10),
  }));

  const outPath = `${DATA_DIR}/films-${list}.json`;
  writeFileSync(outPath, JSON.stringify(films, null, 2), "utf-8");
  console.log(`Wrote ${films.length} films to ${outPath}`);
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

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
