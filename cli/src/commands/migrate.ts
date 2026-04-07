const CMS_URL = process.env.CMS_API_URL ?? "https://cms.really.lol";
const CMS_KEY = process.env.CMS_API_KEY ?? "over-the-hill";
const SITE_CONTENT = "site/src/content";
const SITE_DATA = "site/src/data";
const SITE_PAGES = "site/src/pages";

const R2_BASE = "https://media.really.lol";

async function cmsGet<T>(path: string): Promise<T> {
  const res = await fetch(`${CMS_URL}${path}`, {
    headers: { Authorization: `Bearer ${CMS_KEY}` },
  });
  if (!res.ok) throw new Error(`CMS ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

interface ExportData {
  content: Array<{
    type: string;
    slug: string;
    title: string;
    body: string | null;
    date: string;
    status: string;
    meta: Record<string, unknown>;
    tags: string[];
  }>;
  books: Array<{ shelf: string; title: string; author: string; date_updated: string; image_url: string | null; hardcover_url: string | null }>;
  films: Array<{ list: string; name: string; year: string | null; date_updated: string }>;
  links: Array<{ title: string; url: string; date: string; excerpt: string | null; cover: string | null; tags: string[] }>;
  config: Record<string, unknown>;
}

function transformShortcodes(body: string): string {
  // {{< image src="path" alt="text" caption="text" >}} -> markdown/HTML
  let result = body.replace(
    /\{\{<\s*image\s+([^>]*?)>\}\}/g,
    (_match, attrs: string) => {
      const src = attrs.match(/src="([^"]*?)"/)?.[1] ?? "";
      const alt = attrs.match(/alt="([^"]*?)"/)?.[1] ?? "";
      const caption = attrs.match(/caption="([^"]*?)"/)?.[1];
      const fullSrc = src.startsWith("http") ? src : `${R2_BASE}/${src}`;
      if (caption) {
        return `<figure>\n  <img src="${fullSrc}" alt="${alt}">\n  <figcaption>${caption}</figcaption>\n</figure>`;
      }
      return `![${alt}](${fullSrc})`;
    }
  );

  // {{< audio src="path" caption="text" >}} -> <audio>
  result = result.replace(
    /\{\{<\s*audio\s+([^>]*?)>\}\}/g,
    (_match, attrs: string) => {
      const src = attrs.match(/src="([^"]*?)"/)?.[1] ?? "";
      const fullSrc = src.startsWith("http") ? src : `${R2_BASE}/${src}`;
      return `<audio src="${fullSrc}" controls></audio>`;
    }
  );

  // {{< highlight lang >}}...{{< /highlight >}} -> fenced code blocks
  result = result.replace(
    /\{\{<\s*highlight\s+(\w+)\s*>\}\}([\s\S]*?)\{\{<\s*\/highlight\s*>\}\}/g,
    (_match, lang: string, code: string) => `\`\`\`${lang}\n${code.trim()}\n\`\`\``
  );

  return result;
}

function generateFrontmatter(fields: Record<string, unknown>): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${JSON.stringify(item)}`);
      }
    } else {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function contentDir(type: string): string {
  if (type === "post") return `${SITE_CONTENT}/blog`;
  if (type === "note") return `${SITE_CONTENT}/note`;
  if (type === "photo") return `${SITE_CONTENT}/photo`;
  if (type === "highlight") return `${SITE_CONTENT}/highlight`;
  return `${SITE_CONTENT}/${type}`;
}

export async function migrate() {
  console.log("Fetching all data from CMS...");
  const data = await cmsGet<ExportData>("/api/export?format=json");
  console.log(`  ${data.content.length} content items`);
  console.log(`  ${data.books.length} books, ${data.films.length} films, ${data.links.length} links`);

  // Create directories
  const { mkdirSync, writeFileSync } = await import("fs");
  for (const dir of ["blog", "note", "photo", "highlight"]) {
    mkdirSync(`${SITE_CONTENT}/${dir}`, { recursive: true });
  }
  mkdirSync(SITE_DATA, { recursive: true });

  // Export content
  const counts: Record<string, number> = {};
  const pageItems: typeof data.content = [];

  for (const item of data.content) {
    if (item.status !== "published") continue;
    if (item.type === "page") {
      pageItems.push(item);
      continue;
    }

    const dir = contentDir(item.type);
    const datePrefix = item.date.slice(0, 10);
    const filename = `${datePrefix}-${item.slug}.md`;

    const frontmatter: Record<string, unknown> = {
      title: item.title,
      date: item.date.slice(0, 10),
    };

    if (item.tags.length > 0) frontmatter.tags = item.tags;

    // Merge type-specific meta
    for (const [key, value] of Object.entries(item.meta)) {
      if (value !== null && value !== undefined && value !== "") {
        frontmatter[key] = value;
      }
    }

    let body = item.body ?? "";
    if (body) body = transformShortcodes(body);

    const content = body
      ? `${generateFrontmatter(frontmatter)}\n\n${body}\n`
      : `${generateFrontmatter(frontmatter)}\n`;

    writeFileSync(`${dir}/${filename}`, content, "utf-8");
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }

  // Export pages as standalone .md files
  for (const page of pageItems) {
    const url = (page.meta.url as string) ?? page.slug;
    const cleanPath = url.replace(/^\//, "").replace(/\/$/, "");
    if (!cleanPath) continue;

    // Only export known standalone pages
    const standalonePages = ["now", "uses", "blogroll"];
    const pageName = cleanPath.split("/").pop();
    if (!pageName || !standalonePages.includes(pageName)) {
      console.log(`  Skipping page: ${cleanPath} (not standalone)`);
      continue;
    }

    const frontmatter = generateFrontmatter({
      layout: "../layouts/Plain.astro",
      title: page.title,
    });
    const body = page.body ? transformShortcodes(page.body) : "";
    const content = body
      ? `${frontmatter}\n\n${body}\n`
      : `${frontmatter}\n`;
    writeFileSync(`${SITE_PAGES}/${pageName}.md`, content, "utf-8");
    console.log(`  Page: ${pageName}.md`);
  }

  // Export library data
  const shelves = ["read", "reading", "toread"] as const;
  for (const shelf of shelves) {
    const books = data.books
      .filter((b) => b.shelf === shelf)
      .map(({ title, author, date_updated, image_url, hardcover_url }) => ({
        title, author, date_updated, image_url, hardcover_url,
      }));
    writeFileSync(`${SITE_DATA}/books-${shelf}.json`, JSON.stringify(books, null, 2), "utf-8");
    console.log(`  books-${shelf}.json: ${books.length} items`);
  }

  const filmLists = ["watched", "towatch"] as const;
  for (const list of filmLists) {
    const films = data.films
      .filter((f) => f.list === list)
      .map(({ name, year, date_updated }) => ({ name, year, date_updated }));
    writeFileSync(`${SITE_DATA}/films-${list}.json`, JSON.stringify(films, null, 2), "utf-8");
    console.log(`  films-${list}.json: ${films.length} items`);
  }

  const links = data.links.map(({ title, url, date, excerpt, cover, tags }) => ({
    title, url, date, excerpt, cover, tags,
  }));
  writeFileSync(`${SITE_DATA}/links.json`, JSON.stringify(links, null, 2), "utf-8");
  console.log(`  links.json: ${links.length} items`);

  // Export config
  writeFileSync(`${SITE_DATA}/config.json`, JSON.stringify(data.config, null, 2), "utf-8");
  console.log(`  config.json`);

  console.log("\nContent exported:");
  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type}: ${count} files`);
  }
}
