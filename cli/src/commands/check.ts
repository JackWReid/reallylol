import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const DIST_DIR = "site/dist";

export async function checkLinks() {
  if (!existsSync(DIST_DIR)) {
    console.error("No build output found at site/dist/. Run `bun run build` first.");
    process.exit(1);
  }

  const hrefs = new Set<string>();
  collectHrefs(DIST_DIR, hrefs);

  const broken: Array<{ url: string; sources: string[] }> = [];

  for (const url of hrefs) {
    // Skip external, anchor, and protocol-relative links
    if (!url.startsWith("/")) continue;
    if (url.startsWith("//")) continue;

    const clean = url.replace(/\/$/, "") || "/";
    const candidates = [
      join(DIST_DIR, clean, "index.html"),
      join(DIST_DIR, clean + ".html"),
      join(DIST_DIR, clean),
    ];

    if (!candidates.some((p) => existsSync(p))) {
      // Find which files reference this broken link
      const sources = findSources(DIST_DIR, url);
      broken.push({ url, sources });
    }
  }

  if (broken.length === 0) {
    console.log("No broken internal links found.");
    return;
  }

  console.log(`Found ${broken.length} broken internal links:\n`);
  for (const { url, sources } of broken.sort((a, b) => a.url.localeCompare(b.url))) {
    console.log(`  ${url}`);
    for (const src of sources.slice(0, 3)) {
      console.log(`    ← ${src}`);
    }
    if (sources.length > 3) {
      console.log(`    ← ...and ${sources.length - 3} more`);
    }
  }

  process.exit(1);
}

function collectHrefs(dir: string, hrefs: Set<string>) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHrefs(path, hrefs);
    } else if (entry.name.endsWith(".html")) {
      const content = readFileSync(path, "utf-8");
      const matches = content.matchAll(/href="(\/[^"]*?)"/g);
      for (const m of matches) {
        hrefs.add(m[1]);
      }
    }
  }
}

function findSources(dir: string, url: string, maxDepth = 3): string[] {
  const sources: string[] = [];
  findSourcesInner(dir, url, sources, 0, maxDepth);
  return sources;
}

function findSourcesInner(dir: string, url: string, sources: string[], depth: number, maxDepth: number) {
  if (sources.length >= 5) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (sources.length >= 5) return;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < maxDepth) {
        findSourcesInner(path, url, sources, depth + 1, maxDepth);
      }
    } else if (entry.name.endsWith(".html")) {
      const content = readFileSync(path, "utf-8");
      if (content.includes(`href="${url}"`)) {
        sources.push(path.replace(DIST_DIR, "").replace("/index.html", "/"));
      }
    }
  }
}
