import { CmsApi } from "../lib/api";
import type { MediaListResponse } from "../../../shared/types";

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

export async function mediaCommand(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case "upload":
      return mediaUpload(rest);
    case "list":
      return mediaList(rest);
    case "sync":
      return mediaSync(rest);
    case "verify":
      return mediaVerify(rest);
    default:
      console.error("Usage: cms media <upload|list|sync|verify> [options]");
      process.exit(1);
  }
}

async function mediaUpload(args: string[]): Promise<void> {
  if (args.length < 1) {
    console.error("Usage: cms media upload <path> [--prefix photo] [--key custom/key.jpg]");
    process.exit(1);
  }

  const filePath = args[0];
  const flags = parseFlags(args.slice(1));

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // Determine R2 key
  let key = flags.get("key");
  if (!key) {
    const prefix = flags.get("prefix") ?? "img";
    const filename = filePath.split("/").pop()!;
    key = `${prefix}/${filename}`;
  }

  console.error(`Uploading ${filePath} → ${key}...`);
  const result = await api.uploadFile("/api/media/upload", filePath, key);
  console.log(JSON.stringify(result, null, 2));
}

async function mediaList(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const params = new URLSearchParams();
  if (flags.has("kind")) params.set("kind", flags.get("kind")!);
  if (flags.has("prefix")) params.set("prefix", flags.get("prefix")!);
  if (flags.has("limit")) params.set("limit", flags.get("limit")!);
  if (flags.has("page")) params.set("page", flags.get("page")!);

  const qs = params.toString();
  const data = (await api.get(
    `/api/media${qs ? `?${qs}` : ""}`,
  )) as MediaListResponse;

  if (flags.get("format") === "table") {
    console.log(`${data.total} items (page ${data.page})\n`);
    for (const item of data.items) {
      const size = item.size_bytes
        ? `${(item.size_bytes / 1024).toFixed(0)}KB`
        : "?";
      console.log(`  [${item.kind}] ${item.r2_key} (${size})`);
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function mediaSync(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const prefix = flags.get("prefix") ?? "";

  console.error("Scanning R2 bucket and registering objects in DB...");

  let totalRegistered = 0;
  let totalSkipped = 0;
  let cursor: string | undefined;
  let page = 0;

  do {
    const params = new URLSearchParams();
    if (prefix) params.set("prefix", prefix);
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();

    const result = (await api.post(`/api/media/sync${qs ? `?${qs}` : ""}`, {})) as {
      registered: number;
      skipped: number;
      next_cursor: string | null;
      done: boolean;
    };

    totalRegistered += result.registered;
    totalSkipped += result.skipped;
    page++;
    console.error(`  Page ${page}: +${result.registered} registered, +${result.skipped} skipped`);

    cursor = result.next_cursor ?? undefined;
  } while (cursor);

  console.log(JSON.stringify({ registered: totalRegistered, skipped: totalSkipped }));
}

async function mediaVerify(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const verbose = flags.has("verbose");

  // Get all content items
  let page = 1;
  const allContent: Array<{ type: string; slug: string; meta: Record<string, unknown> }> = [];

  while (true) {
    const data = (await api.get(
      `/api/content?page=${page}&limit=100`,
    )) as { items: Array<{ type: string; slug: string; meta: Record<string, unknown> }>; total: number };
    allContent.push(...data.items);
    if (allContent.length >= data.total) break;
    page++;
  }

  // Get all media keys
  const mediaKeys = new Set<string>();
  page = 1;
  while (true) {
    const data = (await api.get(
      `/api/media?page=${page}&limit=200`,
    )) as MediaListResponse;
    for (const item of data.items) mediaKeys.add(item.r2_key);
    if (mediaKeys.size >= data.total) break;
    page++;
  }

  // Check photo image refs
  const missing: string[] = [];
  for (const item of allContent) {
    if (item.type === "photo" && item.meta.image) {
      const imageKey = String(item.meta.image);
      if (!mediaKeys.has(imageKey)) {
        missing.push(`photo/${item.slug}: ${imageKey}`);
      } else if (verbose) {
        console.error(`OK: photo/${item.slug}: ${imageKey}`);
      }
    }
    if (item.type === "post" && item.meta.media_image) {
      // External URLs are fine, only check R2 refs
      const ref = String(item.meta.media_image);
      if (!ref.startsWith("http") && !mediaKeys.has(ref)) {
        missing.push(`post/${item.slug}: ${ref}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error(`Found ${missing.length} missing media references:`);
    for (const m of missing) console.error(`  ${m}`);
    process.exit(1);
  } else {
    console.log(JSON.stringify({ ok: true, checked: allContent.length }));
  }
}
