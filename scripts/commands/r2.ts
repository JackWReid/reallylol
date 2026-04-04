/**
 * R2 image sync and verification commands.
 *
 * Subcommands:
 *   bun run sync-r2 sync              Upload local assets/img/ to R2 (skips existing)
 *   bun run sync-r2 verify            Cross-check content frontmatter against R2
 *   bun run sync-r2 sync --dry-run    Show what would be uploaded without uploading
 *   bun run sync-r2 sync --force      Re-upload even if key already exists in R2
 *
 * Requires these env vars (add to .env.local):
 *   R2_ACCESS_KEY_ID       — R2 API token Access Key ID
 *   R2_SECRET_ACCESS_KEY   — R2 API token Secret Access Key
 *   R2_BUCKET              — bucket name (default: reallylol-images-production)
 *   R2_ACCOUNT_ID          — Cloudflare account ID
 *
 * Create R2 API tokens at:
 *   Cloudflare Dashboard → R2 → Manage R2 API Tokens
 *   Permissions needed: Object Read & Write on reallylol-images-production
 */

import { S3Client, HeadObjectCommand, ListObjectsV2Command, HeadObjectCommandInput } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { createReadStream } from "node:fs";
import { lookup as mimeLookup } from "node:path";

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "f163765cc814ca4c341357f282e5d166";
const BUCKET = process.env.R2_BUCKET ?? "reallylol-images-production";
const ROOT = resolve(import.meta.dir, "../..");
const ASSETS_IMG = resolve(ROOT, "assets/img");
const CONTENT_DIR = resolve(ROOT, "src/content");

function mimeType(path: string): string {
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".avif")) return "image/avif";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".pdf")) return "application/pdf";
  if (path.endsWith(".m4a")) return "audio/mp4";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

function makeClient(): S3Client {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error("Missing R2 credentials. Add to .env.local:");
    console.error("  R2_ACCESS_KEY_ID=...");
    console.error("  R2_SECRET_ACCESS_KEY=...");
    console.error("");
    console.error("Create tokens at: Cloudflare Dashboard → R2 → Manage R2 API Tokens");
    process.exit(1);
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/** Recursively list all files under a local directory, returning paths relative to that dir. */
async function listLocal(dir: string): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        results.push(relative(dir, full));
      }
    }
  }
  await walk(dir);
  return results;
}

/** Check whether a key exists in R2. */
async function existsInR2(client: S3Client, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e: any) {
    if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

/** Upload a single file to R2. */
async function upload(client: S3Client, localPath: string, key: string): Promise<void> {
  const body = createReadStream(localPath);
  const uploader = new Upload({
    client,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: mimeType(localPath),
    },
  });
  await uploader.done();
}

// ─── sync ────────────────────────────────────────────────────────────────────

export async function syncR2(args: string[]): Promise<void> {
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const concurrency = 8; // parallel uploads

  // Load .env.local
  const envPath = resolve(ROOT, ".env.local");
  const envFile = Bun.file(envPath);
  if (await envFile.exists()) {
    const text = await envFile.text();
    for (const line of text.split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
    }
  }

  const client = makeClient();

  console.log(`Bucket:  ${BUCKET}`);
  console.log(`Source:  ${ASSETS_IMG}`);
  console.log(`Mode:    ${dryRun ? "dry-run" : force ? "force" : "skip-existing"}`);
  console.log();

  const files = await listLocal(ASSETS_IMG);
  console.log(`Found ${files.length} local files in assets/img/`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches of `concurrency`
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (relPath) => {
        // R2 key mirrors the local path: assets/img/photo/foo.jpg → img/photo/foo.jpg
        const key = `img/${relPath}`;
        const localPath = join(ASSETS_IMG, relPath);

        if (!force && await existsInR2(client, key)) {
          skipped++;
          return;
        }

        if (dryRun) {
          console.log(`  would upload: ${key}`);
          uploaded++;
          return;
        }

        try {
          await upload(client, localPath, key);
          uploaded++;
          if (uploaded % 50 === 0) {
            console.log(`  uploaded ${uploaded} / ${files.length - skipped}...`);
          }
        } catch (e: any) {
          console.error(`  FAILED: ${key} — ${e.message}`);
          failed++;
        }
      })
    );
  }

  console.log();
  console.log(`Done.`);
  console.log(`  Uploaded: ${uploaded}`);
  console.log(`  Skipped (already exists): ${skipped}`);
  if (failed) console.log(`  Failed: ${failed}`);

  if (failed > 0) process.exit(1);
}

// ─── verify ──────────────────────────────────────────────────────────────────

export async function verifyR2(args: string[]): Promise<void> {
  const verbose = args.includes("--verbose");

  // Load .env.local
  const envPath = resolve(ROOT, ".env.local");
  const envFile = Bun.file(envPath);
  if (await envFile.exists()) {
    const text = await envFile.text();
    for (const line of text.split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k && rest.length) process.env[k.trim()] = rest.join("=").trim();
    }
  }

  const client = makeClient();
  console.log(`Verifying image paths in R2 bucket: ${BUCKET}`);
  console.log();

  // Collect all image paths referenced in frontmatter
  const imagePaths = new Set<string>();

  // Photos: image field
  const photoDir = resolve(CONTENT_DIR, "photo");
  const photoFiles = await readdir(photoDir);
  for (const file of photoFiles) {
    if (!file.endsWith(".md")) continue;
    const text = await readFile(join(photoDir, file), "utf-8");
    const match = text.match(/^image:\s*["']?([^"'\n]+)["']?/m);
    if (match) imagePaths.add(match[1].trim().replace(/^\//, ""));
  }

  // Posts: media_image field (external URLs, skip those)
  const postDir = resolve(CONTENT_DIR, "post");
  const postFiles = await readdir(postDir);
  for (const file of postFiles) {
    if (!file.endsWith(".md")) continue;
    const text = await readFile(join(postDir, file), "utf-8");
    const match = text.match(/^media_image:\s*["']?([^"'\n]+)["']?/m);
    if (match) {
      const path = match[1].trim().replace(/^\//, "");
      if (!path.startsWith("http")) imagePaths.add(path);
    }
  }

  console.log(`Checking ${imagePaths.size} unique image paths...`);

  const missing: string[] = [];
  let checked = 0;

  // Check in parallel batches
  const pathList = [...imagePaths];
  const concurrency = 20;
  for (let i = 0; i < pathList.length; i += concurrency) {
    const batch = pathList.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (imgPath) => {
        const exists = await existsInR2(client, imgPath);
        checked++;
        if (!exists) {
          missing.push(imgPath);
          if (verbose) console.log(`  MISSING: ${imgPath}`);
        }
        if (checked % 200 === 0) {
          process.stdout.write(`  ${checked}/${pathList.length}...\r`);
        }
      })
    );
  }

  console.log();
  console.log(`Checked: ${checked} paths`);

  if (missing.length === 0) {
    console.log(`✓ All images present in R2`);
  } else {
    console.log(`✗ Missing: ${missing.length} images`);
    if (!verbose) {
      console.log(`  (run with --verbose to list them)`);
      for (const p of missing.slice(0, 10)) console.log(`  ${p}`);
      if (missing.length > 10) console.log(`  ...and ${missing.length - 10} more`);
    }
    process.exit(1);
  }
}
