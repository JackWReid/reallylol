import { CmsApi, ApiError } from "../lib/api";
import type { ContentItem, ContentListResponse } from "../../../shared/types";

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

export async function contentCommand(args: string[]): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case "list":
      return contentList(rest);
    case "get":
      return contentGet(rest);
    case "create":
      return contentCreate(rest);
    case "edit":
      return contentEdit(rest);
    case "delete":
      return contentDelete(rest);
    default:
      console.error(
        "Usage: cms content <list|get|create|edit|delete> [options]",
      );
      process.exit(1);
  }
}

async function contentList(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  const params = new URLSearchParams();
  if (flags.has("type")) params.set("type", flags.get("type")!);
  if (flags.has("status")) params.set("status", flags.get("status")!);
  if (flags.has("tag")) params.set("tag", flags.get("tag")!);
  if (flags.has("limit")) params.set("limit", flags.get("limit")!);
  if (flags.has("page")) params.set("page", flags.get("page")!);
  if (flags.has("sort")) params.set("sort", flags.get("sort")!);

  const qs = params.toString();
  const data = (await api.get(
    `/api/content${qs ? `?${qs}` : ""}`,
  )) as ContentListResponse;

  if (flags.get("format") === "table") {
    console.log(
      `${data.total} items (page ${data.page}, limit ${data.limit})\n`,
    );
    for (const item of data.items) {
      const tags = item.tags.length > 0 ? ` [${item.tags.join(", ")}]` : "";
      console.log(
        `  ${item.status === "draft" ? "DRAFT " : ""}${item.type}/${item.slug} — ${item.title}${tags}`,
      );
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function contentGet(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: cms content get <type> <slug>");
    process.exit(1);
  }
  const [type, slug] = args;
  const data = await api.get(`/api/content/${type}/${slug}`);
  console.log(JSON.stringify(data, null, 2));
}

async function contentCreate(args: string[]): Promise<void> {
  if (args.length < 1) {
    console.error(
      "Usage: cms content create <type> --title '...' [--body '...' | --file path.md] [--tags a,b] [--meta '{}'] [--status draft|published] [--slug '...'] [--date '...']",
    );
    process.exit(1);
  }

  const type = args[0];
  const flags = parseFlags(args.slice(1));

  const title = flags.get("title");
  if (!title) {
    console.error("--title is required");
    process.exit(1);
  }

  let body = flags.get("body") ?? "";
  if (flags.has("file")) {
    const file = Bun.file(flags.get("file")!);
    body = await file.text();
  }
  // Read from stdin if body is "-"
  if (body === "-") {
    const chunks: Uint8Array[] = [];
    const reader = Bun.stdin.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    body = Buffer.concat(chunks).toString("utf-8");
  }

  const slug =
    flags.get("slug") ??
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const payload: Record<string, unknown> = {
    type,
    slug,
    title,
    body,
    status: flags.get("status") ?? "draft",
  };

  if (flags.has("date")) payload.date = flags.get("date");
  if (flags.has("tags")) payload.tags = flags.get("tags")!.split(",");
  if (flags.has("meta")) payload.meta = JSON.parse(flags.get("meta")!);

  const data = await api.post("/api/content", payload);
  console.log(JSON.stringify(data, null, 2));
}

async function contentEdit(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error(
      "Usage: cms content edit <type> <slug> [--title '...' --body '...' --tags a,b --status published]",
    );
    process.exit(1);
  }

  const [type, slug] = args;
  const flags = parseFlags(args.slice(2));

  const payload: Record<string, unknown> = {};
  if (flags.has("title")) payload.title = flags.get("title");
  if (flags.has("body")) {
    let body = flags.get("body")!;
    if (body === "-") {
      const chunks: Uint8Array[] = [];
      const reader = Bun.stdin.stream().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      body = Buffer.concat(chunks).toString("utf-8");
    }
    payload.body = body;
  }
  if (flags.has("file")) {
    const file = Bun.file(flags.get("file")!);
    payload.body = await file.text();
  }
  if (flags.has("date")) payload.date = flags.get("date");
  if (flags.has("status")) payload.status = flags.get("status");
  if (flags.has("tags")) payload.tags = flags.get("tags")!.split(",");
  if (flags.has("meta")) payload.meta = JSON.parse(flags.get("meta")!);

  if (Object.keys(payload).length === 0) {
    console.error("No fields to update");
    process.exit(1);
  }

  const data = await api.put(`/api/content/${type}/${slug}`, payload);
  console.log(JSON.stringify(data, null, 2));
}

async function contentDelete(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error("Usage: cms content delete <type> <slug>");
    process.exit(1);
  }
  const [type, slug] = args;
  const data = await api.del(`/api/content/${type}/${slug}`);
  console.log(JSON.stringify(data, null, 2));
}
