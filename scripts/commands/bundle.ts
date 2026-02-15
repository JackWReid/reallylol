/** Bundle conversion commands: to-bundle and to-post. */

import { resolve, relative, basename, dirname } from "path";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  mkdirSync,
  copyFileSync,
  renameSync,
  rmdirSync,
  writeFileSync,
} from "fs";
import { fzfSelect } from "../lib/picker";
import { ROOT, POST_DIR } from "../lib/paths";

// ─── Shared regex patterns ──────────────────────────────────────────────────

const SHORTCODE_RE =
  /{{<(\s*)(image|photo|figure)([^>]*)src="([^"]+)"([^>]*)>}}/gi;
const MARKDOWN_IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const FM_IMAGE_RE = /^(image\s*:\s*)"(\/img\/[^"]+)"/gm;
const MEDIA_MATCHERS = [
  /{{<\s*(?:image|photo|figure)[^>]*src="[^"]+"/i,
  /!\[[^\]]*\]\(\/?img\//i,
];

const ASSET_DIRS = [resolve(ROOT, "assets/img"), resolve(ROOT, "static/img")];

// ─── to-bundle ──────────────────────────────────────────────────────────────

interface PostInfo {
  path: string;
  title: string;
  dateStr: string;
  dateSort: Date;
  hasMedia: boolean;
  relPath: string;
}

function parseFrontMatter(path: string): { title: string | null; date: string | null; text: string } {
  if (!existsSync(path)) return { title: null, date: null, text: "" };
  const text = readFileSync(path, "utf-8");
  if (!text.startsWith("---")) return { title: null, date: null, text };
  const parts = text.split("---", 3);
  if (parts.length < 3) return { title: null, date: null, text };

  let title: string | null = null;
  let date: string | null = null;

  for (const line of parts[1].split("\n")) {
    const stripped = line.trim();
    if (stripped.toLowerCase().startsWith("title:") && !title) {
      title = stripped.split(":", 2)[1]?.trim().replace(/^"|"$/g, "") ?? null;
    }
    if (stripped.toLowerCase().startsWith("date:") && !date) {
      date = stripped.split(":", 2)[1]?.trim() ?? null;
    }
  }

  return { title, date, text };
}

function parsePostInfo(path: string): PostInfo {
  const { title, date: dateStr, text } = parseFrontMatter(path);
  let dateSort = new Date(0);
  if (dateStr) {
    try {
      dateSort = new Date(dateStr.replace("Z", "+00:00"));
      if (isNaN(dateSort.getTime())) dateSort = new Date(0);
    } catch {
      dateSort = new Date(0);
    }
  }
  const hasMedia = MEDIA_MATCHERS.some((re) => re.test(text));
  return {
    path,
    title: title ?? basename(path, ".md"),
    dateStr: dateStr ?? "",
    dateSort,
    hasMedia,
    relPath: relative(ROOT, path),
  };
}

function listFlatPosts(): PostInfo[] {
  if (!existsSync(POST_DIR)) return [];
  return readdirSync(POST_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parsePostInfo(resolve(POST_DIR, f)))
    .sort((a, b) => b.dateSort.getTime() - a.dateSort.getTime());
}

function copyMedia(
  relPath: string,
  bundleDir: string,
  copied: Map<string, string>,
): string {
  const trimmed = relPath.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;

  let normalised = trimmed.replace(/^\//, "");
  if (normalised.startsWith("img/")) normalised = normalised.slice(4);
  if (!normalised) return relPath;
  if (copied.has(normalised)) return normalised;

  let source: string | null = null;
  for (const base of ASSET_DIRS) {
    const candidate = resolve(base, normalised);
    if (existsSync(candidate)) {
      source = candidate;
      break;
    }
  }

  if (!source) {
    console.warn(`[WARN] Unable to locate source for ${relPath}`);
    copied.set(normalised, normalised);
    return normalised;
  }

  const destPath = resolve(bundleDir, normalised);
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(source, destPath);
  copied.set(normalised, normalised);
  return normalised;
}

function convertPost(postPath: string): void {
  const resolved = resolve(postPath);
  if (!existsSync(resolved)) throw new Error(`Post not found: ${resolved}`);

  const bundleDir = resolved.replace(/\.md$/, "");
  if (existsSync(bundleDir))
    throw new Error(`Bundle directory already exists: ${bundleDir}`);

  mkdirSync(bundleDir, { recursive: true });
  const indexPath = resolve(bundleDir, "index.md");
  renameSync(resolved, indexPath);

  let text = readFileSync(indexPath, "utf-8");
  const copied = new Map<string, string>();

  // Replace frontmatter image paths
  text = text.replace(FM_IMAGE_RE, (_match, prefix, src) => {
    const cleaned = copyMedia(src, bundleDir, copied);
    return `${prefix}"${cleaned}"`;
  });

  // Replace shortcodes
  text = text.replace(
    SHORTCODE_RE,
    (_match, space, _name, before, src, after) => {
      const cleaned = copyMedia(src, bundleDir, copied);
      return `{{<${space}image${before}src="${cleaned}"${after}>}}`;
    },
  );

  // Replace markdown images
  text = text.replace(MARKDOWN_IMG_RE, (_match, alt, src) => {
    const cleaned = copyMedia(src, bundleDir, copied);
    const altEscaped = alt.replace(/"/g, "&quot;");
    return `{{< image src="${cleaned}" alt="${altEscaped}" >}}`;
  });

  writeFileSync(indexPath, text, "utf-8");
  console.log(`Converted to bundle: ${relative(ROOT, bundleDir)}`);
}

export async function toBundle(args: string[]): Promise<void> {
  const posts = listFlatPosts();

  if (args.includes("--all-media")) {
    const targets = posts.filter((p) => p.hasMedia);
    if (targets.length === 0) {
      console.log("No media posts found to convert.");
      return;
    }
    for (const t of targets) convertPost(t.path);
    return;
  }

  const pathArg = args.find((a) => a.startsWith("--path="))?.split("=")[1];
  if (pathArg) {
    convertPost(resolve(ROOT, pathArg));
    return;
  }

  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  if (slugArg) {
    convertPost(resolve(POST_DIR, `${slugArg}.md`));
    return;
  }

  // Interactive fzf selection
  const entries = posts.map((p) => {
    const dateDisplay =
      p.dateSort.getTime() > 0
        ? p.dateSort.toISOString().slice(0, 10)
        : "0000-00-00";
    const icon = p.hasMedia ? "✓" : " ";
    const display = `${icon} ${p.title}`;
    return `|${icon}|${p.title}|${dateDisplay}|${p.relPath}|${display}`;
  });

  if (entries.length === 0) {
    console.log("No eligible posts found.");
    return;
  }

  const selected = await fzfSelect(entries, {
    delimiter: "|",
    withNth: "6",
    prompt: "Convert post> ",
    header: "[ENTER] convert post | ✓ = has media",
    statusFn: (line) => {
      const p = line.split("|");
      return `Date: ${p[3]}`;
    },
  });

  if (!selected) {
    console.log("No selection made.");
    return;
  }

  const relPath = selected.split("|")[4].trim();
  convertPost(resolve(ROOT, relPath));
}

// ─── to-post ────────────────────────────────────────────────────────────────

function isEmptyBundle(dirPath: string): boolean {
  if (!statSync(dirPath, { throwIfNoEntry: false })?.isDirectory()) return false;
  const indexMd = resolve(dirPath, "index.md");
  if (!existsSync(indexMd)) return false;
  const files = readdirSync(dirPath).filter((f) => !f.startsWith("."));
  return files.length === 1 && files[0] === "index.md";
}

function listEmptyBundles(): string[] {
  if (!existsSync(POST_DIR)) return [];
  return readdirSync(POST_DIR)
    .map((f) => resolve(POST_DIR, f))
    .filter((f) => statSync(f).isDirectory() && isEmptyBundle(f))
    .sort();
}

function convertBundle(bundleDir: string): void {
  const resolved = resolve(bundleDir);
  const indexMd = resolve(resolved, "index.md");
  if (!existsSync(indexMd))
    throw new Error(`index.md not found in ${resolved}`);

  const targetFile = resolve(POST_DIR, `${basename(resolved)}.md`);
  if (existsSync(targetFile))
    throw new Error(`Target file already exists: ${targetFile}`);

  renameSync(indexMd, targetFile);
  rmdirSync(resolved);
  console.log(`Converted bundle to post: ${relative(ROOT, targetFile)}`);
}

export async function toPost(args: string[]): Promise<void> {
  const bundles = listEmptyBundles();

  if (args.includes("--all")) {
    if (bundles.length === 0) {
      console.log("No empty bundles found to convert.");
      return;
    }
    for (const b of bundles) convertBundle(b);
    return;
  }

  const pathArg = args.find((a) => a.startsWith("--path="))?.split("=")[1];
  if (pathArg) {
    const bundlePath = resolve(ROOT, pathArg);
    if (!isEmptyBundle(bundlePath)) {
      console.error(
        `Error: ${bundlePath} is not an empty bundle (contains files other than index.md).`,
      );
      process.exit(1);
    }
    convertBundle(bundlePath);
    return;
  }

  const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];
  if (slugArg) {
    const bundlePath = resolve(POST_DIR, slugArg);
    if (!isEmptyBundle(bundlePath)) {
      console.error(
        `Error: ${bundlePath} is not an empty bundle (contains files other than index.md).`,
      );
      process.exit(1);
    }
    convertBundle(bundlePath);
    return;
  }

  // Interactive
  if (bundles.length === 0) {
    console.log("No empty bundles found.");
    return;
  }

  const entries = bundles.map((b) => relative(ROOT, b));
  const selected = await fzfSelect(entries, {
    prompt: "Convert bundle> ",
    header:
      "[ENTER] convert bundle | Only shows bundles with only index.md",
  });

  if (!selected) {
    console.log("No selection made.");
    return;
  }

  convertBundle(resolve(ROOT, selected));
}
