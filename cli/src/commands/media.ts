import { readFileSync, readdirSync } from "fs";
import { join, extname } from "path";
import { upload, exists, listObjects } from "../lib/r2";

const CONTENT_DIR = "site/src/content";
const R2_BASE = "https://media.really.lol";

export async function mediaUpload(filePath: string, opts: { prefix?: string }) {
  const name = filePath.split("/").pop()!;
  const key = opts.prefix ? `${opts.prefix}/${name}` : `img/${name}`;
  console.log(`Uploading to ${key}...`);
  await upload(filePath, key);
  console.log(`Done. Key: ${key}`);
  console.log(`URL: ${R2_BASE}/${key}`);
}

export async function mediaVerify() {
  const refs = new Set<string>();

  for (const dir of ["photo"]) {
    const dirPath = join(CONTENT_DIR, dir);
    try {
      for (const file of readdirSync(dirPath)) {
        if (!file.endsWith(".md")) continue;
        const content = readFileSync(join(dirPath, file), "utf-8");
        const imageMatch = content.match(/^image:\s*"?([^"\n]+)"?/m);
        if (imageMatch) refs.add(imageMatch[1].trim());
      }
    } catch { /* directory doesn't exist */ }
  }

  for (const dir of ["blog", "note", "photo", "highlight"]) {
    const dirPath = join(CONTENT_DIR, dir);
    try {
      for (const file of readdirSync(dirPath)) {
        if (!file.endsWith(".md")) continue;
        const content = readFileSync(join(dirPath, file), "utf-8");
        const urlMatches = content.matchAll(new RegExp(`${R2_BASE}/([^"\\s)]+)`, "g"));
        for (const match of urlMatches) refs.add(match[1]);
      }
    } catch { /* directory doesn't exist */ }
  }

  console.log(`Found ${refs.size} media references`);
  let missing = 0;
  for (const ref of refs) {
    const found = await exists(ref);
    if (!found) {
      console.log(`  MISSING: ${ref}`);
      missing++;
    }
  }
  console.log(`\n${missing} missing, ${refs.size - missing} OK`);
}

export async function mediaOrphans() {
  const refs = new Set<string>();
  for (const dir of ["blog", "note", "photo", "highlight"]) {
    const dirPath = join(CONTENT_DIR, dir);
    try {
      for (const file of readdirSync(dirPath)) {
        if (!file.endsWith(".md")) continue;
        const content = readFileSync(join(dirPath, file), "utf-8");
        const imageMatch = content.match(/^image:\s*"?([^"\n]+)"?/m);
        if (imageMatch) refs.add(imageMatch[1].trim());
        const urlMatches = content.matchAll(new RegExp(`${R2_BASE}/([^"\\s)]+)`, "g"));
        for (const match of urlMatches) refs.add(match[1]);
      }
    } catch { /* directory doesn't exist */ }
  }

  const allKeys = await listObjects();
  const orphans = allKeys.filter((key) => !refs.has(key));
  console.log(`${orphans.length} orphaned objects (of ${allKeys.length} total)`);
  for (const key of orphans) {
    console.log(`  ${key}`);
  }
}
