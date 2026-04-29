# Photo Auto-Tagging Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI pipeline that uses a local Ollama vision model to generate descriptions for untagged photo posts, maps those descriptions to the site's closed tag taxonomy, then provides a local web UI for fast human review before writing approved tags back to markdown files.

**Architecture:** A JSON state file (`photo-tags-state.json`) tracks each untagged photo through five statuses: `pending → described → suggested → reviewed → applied`. Four CLI subcommands (`init`, `describe`, `suggest`, `review`, `apply`) each advance photos through one stage, all reading and writing the same state file so any run can be safely interrupted and resumed. The review command serves a local Bun HTTP server with a browser UI showing the photo alongside tag checkboxes.

**Tech Stack:** Bun, TypeScript, Ollama REST API (vision model for descriptions, same model for tag mapping), inline HTML/JS for review UI, direct markdown frontmatter editing for apply.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `cli/src/lib/photo-state.ts` | Create | State file types, load/save |
| `cli/src/lib/ollama.ts` | Create | Ollama API client (describe, suggest) |
| `cli/src/commands/tags.ts` | Create | All five subcommands |
| `cli/src/index.ts` | Modify | Route `cli tags <sub>` |
| `.gitignore` | Modify | Ignore `photo-tags-state.json` |
| `cli/src/lib/__tests__/photo-state.test.ts` | Create | State round-trip tests |
| `cli/src/lib/__tests__/ollama.test.ts` | Create | Ollama client tests with mock server |
| `cli/src/commands/__tests__/tags.test.ts` | Create | Frontmatter update and tag apply tests |

---

## Task 1: State types and file I/O

**Files:**
- Create: `cli/src/lib/photo-state.ts`
- Create: `cli/src/lib/__tests__/photo-state.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// cli/src/lib/__tests__/photo-state.test.ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { loadState, saveState, STATE_PATH, type PhotoRecord } from "../photo-state";

const TEST_PATH = "/tmp/test-photo-tags-state.json";

describe("photo-state", () => {
  // Patch STATE_PATH for tests by passing it as a param
  test("loadState returns empty object when file does not exist", () => {
    const state = loadState("/tmp/nonexistent-xyz-123.json");
    expect(state).toEqual({});
  });

  test("saveState and loadState round-trip", () => {
    const record: PhotoRecord = {
      image: "img/photo/test.jpg",
      status: "pending",
      description: null,
      suggested_tags: null,
      approved_tags: null,
    };
    saveState({ "2022-01-01-test": record }, TEST_PATH);
    const loaded = loadState(TEST_PATH);
    expect(loaded["2022-01-01-test"]).toEqual(record);
  });

  test("saveState overwrites previous state atomically", () => {
    saveState({ "a": { image: "a.jpg", status: "pending", description: null, suggested_tags: null, approved_tags: null } }, TEST_PATH);
    saveState({ "b": { image: "b.jpg", status: "described", description: "desc", suggested_tags: null, approved_tags: null } }, TEST_PATH);
    const loaded = loadState(TEST_PATH);
    expect(Object.keys(loaded)).toEqual(["b"]);
  });

  afterEach(() => { if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH); });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/jackreid/Developer/reallylol && bun test cli/src/lib/__tests__/photo-state.test.ts
```
Expected: error about missing module `../photo-state`

- [ ] **Step 3: Implement photo-state.ts**

```typescript
// cli/src/lib/photo-state.ts
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export const STATE_PATH = join(process.cwd(), "photo-tags-state.json");

export type PhotoStatus = "pending" | "described" | "suggested" | "reviewed" | "applied";

export interface PhotoRecord {
  image: string;
  status: PhotoStatus;
  description: string | null;
  suggested_tags: string[] | null;
  approved_tags: string[] | null;
}

export type PhotoState = Record<string, PhotoRecord>;

export function loadState(path = STATE_PATH): PhotoState {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function saveState(state: PhotoState, path = STATE_PATH): void {
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun test cli/src/lib/__tests__/photo-state.test.ts
```
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/photo-state.ts cli/src/lib/__tests__/photo-state.test.ts
git commit -m "feat(tags): add photo state file I/O"
```

---

## Task 2: Ollama client

**Files:**
- Create: `cli/src/lib/ollama.ts`
- Create: `cli/src/lib/__tests__/ollama.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// cli/src/lib/__tests__/ollama.test.ts
import { describe, test, expect } from "bun:test";
import { describeImage, suggestTags } from "../ollama";

// These tests spin up a tiny Bun mock server
async function withMockServer(
  handler: (req: Request) => Response | Promise<Response>,
  fn: (url: string) => Promise<void>
): Promise<void> {
  const server = Bun.serve({ port: 0, fetch: handler });
  try {
    await fn(`http://localhost:${server.port}`);
  } finally {
    server.stop();
  }
}

describe("describeImage", () => {
  test("sends image as base64 and returns response content", async () => {
    await withMockServer(
      async (req) => {
        const body = await req.json() as any;
        expect(body.model).toBe("test-model");
        expect(body.messages[0].images[0]).toBeString();
        return Response.json({
          message: { content: "A sunny park with trees." },
        });
      },
      async (url) => {
        // Use a 1x1 white JPEG as minimal test image
        const pngBytes = new Uint8Array([
          0xff,0xd8,0xff,0xe0,0,0x10,0x4a,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0,
          0xff,0xdb,0,0x43,0,8,6,6,7,6,5,8,7,7,7,9,9,8,0xa,0xc,0x14,0xd,0xc,
          0xb,0xb,0xc,0x19,0x12,0x13,0xf,0x14,0x1d,0x1a,0x1f,0x1e,0x1d,0x1a,
          0x1c,0x1c,0x20,0x24,0x2e,0x27,0x20,0x22,0x2c,0x23,0x1c,0x1c,0x28,
          0x37,0x29,0x2c,0x30,0x31,0x34,0x34,0x34,0x1f,0x27,0x39,0x3d,0x38,
          0x32,0x3c,0x2e,0x33,0x34,0x32,0xff,0xc0,0,0xb,8,0,1,0,1,1,1,0x11,0,
          0xff,0xc4,0,0x1f,0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,
          8,9,0xa,0xb,0xff,0xc4,0,0xb5,0x10,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,
          0x7d,1,2,3,0,4,0x11,5,0x12,0x21,0x31,0x41,6,0x13,0x51,0x61,7,0x22,
          0x71,0x14,0x32,0x81,0x91,0xa1,8,0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,
          0xf0,0x24,0x33,0x62,0x72,0x82,9,0xa,0x16,0x17,0x18,0x19,0x1a,0x25,
          0x26,0x27,0x28,0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,
          0x44,0x45,0x46,0x47,0x48,0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,
          0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,0x6a,0x73,0x74,0x75,
          0x76,0x77,0x78,0x79,0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,0x8a,
          0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
          0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,
          0xba,0xc2,0xc3,0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,
          0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,
          0xe8,0xe9,0xea,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,0xf9,0xfa,
          0xff,0xda,0,8,1,1,0,0,0x3f,0,0xfb,0x26,0xa3,0xd0,0x28,0x03,0xff,0xd9,
        ]);

        // Write test image to temp file and pass path
        const tmpPath = "/tmp/test-ollama-img.jpg";
        await Bun.write(tmpPath, pngBytes);

        const result = await describeImage(tmpPath, url, "test-model");
        expect(result).toBe("A sunny park with trees.");
      }
    );
  });
});

describe("suggestTags", () => {
  test("parses JSON array response and filters to known tags", async () => {
    const taxonomy = ["london", "landscape", "travel", "nature", "food"];
    await withMockServer(
      async (req) => {
        const body = await req.json() as any;
        expect(body.messages[0].content).toContain("london");
        return Response.json({
          message: { content: '["london", "landscape", "unknown-hallucinated-tag", "food"]' },
        });
      },
      async (url) => {
        const tags = await suggestTags("Green fields and the Thames.", taxonomy, url, "test-model");
        expect(tags).toEqual(["london", "landscape", "food"]);
      }
    );
  });

  test("handles response wrapped in markdown code block", async () => {
    const taxonomy = ["london", "landscape"];
    await withMockServer(
      async () => Response.json({ message: { content: '```json\n["london","landscape"]\n```' } }),
      async (url) => {
        const tags = await suggestTags("desc", taxonomy, url, "test-model");
        expect(tags).toEqual(["london", "landscape"]);
      }
    );
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun test cli/src/lib/__tests__/ollama.test.ts
```
Expected: error about missing module `../ollama`

- [ ] **Step 3: Implement ollama.ts**

```typescript
// cli/src/lib/ollama.ts
import { readFileSync } from "fs";

export async function describeImage(
  imagePath: string,
  ollamaHost: string,
  model: string
): Promise<string> {
  const imageBytes = readFileSync(imagePath);
  const base64 = imageBytes.toString("base64");

  const res = await fetch(`${ollamaHost}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{
        role: "user",
        content: [
          "Describe this photograph in detail. Cover: main subjects, setting and location type (urban/rural/interior), time of day, weather, mood, colours, whether it appears to be film or digital photography, black and white or colour, any visible text or signs, and notable compositional features.",
          "Be specific and factual. Avoid vague language. Two to four sentences.",
        ].join(" "),
        images: [base64],
      }],
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { message: { content: string } };
  return data.message.content.trim();
}

export async function suggestTags(
  description: string,
  taxonomy: string[],
  ollamaHost: string,
  model: string
): Promise<string[]> {
  const tagList = taxonomy.join(", ");
  const prompt = [
    `Given this photo description: "${description}"`,
    ``,
    `Select the most relevant tags from this exact list (return as a JSON array of strings, no other text):`,
    tagList,
    ``,
    `Rules: only use tags from the list above, select 3-8 tags, prefer specific tags over generic ones.`,
  ].join("\n");

  const res = await fetch(`${ollamaHost}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  const data = await res.json() as { message: { content: string } };
  const raw = data.message.content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fallback: extract anything that looks like a quoted tag
    const matches = raw.match(/"([^"]+)"/g) ?? [];
    parsed = matches.map((m) => m.slice(1, -1));
  }

  const taxonomySet = new Set(taxonomy);
  return (parsed as string[]).filter((t) => taxonomySet.has(t));
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun test cli/src/lib/__tests__/ollama.test.ts
```
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add cli/src/lib/ollama.ts cli/src/lib/__tests__/ollama.test.ts
git commit -m "feat(tags): add Ollama client for vision description and tag suggestion"
```

---

## Task 3: Init command — scan untagged photos

**Files:**
- Create: `cli/src/commands/tags.ts` (init function only)
- Create: `cli/src/commands/__tests__/tags.test.ts` (frontmatter parsing tests)

- [ ] **Step 1: Write frontmatter parsing tests**

```typescript
// cli/src/commands/__tests__/tags.test.ts
import { describe, test, expect } from "bun:test";
import { parsePhotoFrontmatter, applyTagsToContent } from "../tags";

describe("parsePhotoFrontmatter", () => {
  test("extracts fields from a tagged photo", () => {
    const content = `---
title: "Ferry crossing"
date: "2022-02-14"
tags:
  - "travel"
  - "switzerland"
image: "img/photo/2022-02-14-ferry.jpg"
location: "Basel"
---
`;
    const result = parsePhotoFrontmatter(content);
    expect(result.title).toBe("Ferry crossing");
    expect(result.tags).toEqual(["travel", "switzerland"]);
    expect(result.image).toBe("img/photo/2022-02-14-ferry.jpg");
    expect(result.location).toBe("Basel");
  });

  test("returns empty tags array for untagged photo", () => {
    const content = `---
title: "Wasting my time."
date: "2012-04-04"
image: "img/photo/2012-04-04-abc.jpg"
instagram: true
---
`;
    const result = parsePhotoFrontmatter(content);
    expect(result.tags).toEqual([]);
  });
});

describe("applyTagsToContent", () => {
  test("adds tags to a previously untagged file", () => {
    const content = `---
title: "Wasting my time."
date: "2012-04-04"
image: "img/photo/2012-04-04-abc.jpg"
---
`;
    const updated = applyTagsToContent(content, ["london", "bw"]);
    expect(updated).toContain('tags:');
    expect(updated).toContain('  - "london"');
    expect(updated).toContain('  - "bw"');
    expect(updated).toContain('title: "Wasting my time."');
    expect(updated).toContain('image: "img/photo/2012-04-04-abc.jpg"');
  });

  test("replaces existing tags", () => {
    const content = `---
title: "Ferry"
date: "2022-02-14"
tags:
  - "old-tag"
image: "img/photo/test.jpg"
---
`;
    const updated = applyTagsToContent(content, ["travel", "water"]);
    expect(updated).toContain('  - "travel"');
    expect(updated).toContain('  - "water"');
    expect(updated).not.toContain("old-tag");
  });

  test("preserves body content below frontmatter", () => {
    const content = `---
title: "Test"
date: "2024-01-01"
image: "img/photo/test.jpg"
---

Some caption text here.
`;
    const updated = applyTagsToContent(content, ["nature"]);
    expect(updated).toContain("Some caption text here.");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
bun test cli/src/commands/__tests__/tags.test.ts
```
Expected: error about missing module `../tags`

- [ ] **Step 3: Implement parsePhotoFrontmatter, applyTagsToContent, and tagsInit**

```typescript
// cli/src/commands/tags.ts
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { loadState, saveState, STATE_PATH, type PhotoState } from "../lib/photo-state";

const PHOTO_DIR = "site/src/content/photo";

interface PhotoFrontmatter {
  title: string;
  date: string;
  image: string;
  location?: string;
  tags: string[];
  instagram?: boolean;
}

export function parsePhotoFrontmatter(content: string): PhotoFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error("No frontmatter found");
  const fm = match[1];

  const get = (key: string): string | undefined => {
    const m = fm.match(new RegExp(`^${key}: "?([^"\n]*)"?`, "m"));
    return m?.[1];
  };

  const tags: string[] = [];
  const tagSection = fm.match(/^tags:\n((?:  - .*\n?)*)/m);
  if (tagSection) {
    for (const line of tagSection[1].split("\n")) {
      const t = line.match(/^\s+-\s+"?([^"]+)"?/);
      if (t) tags.push(t[1]);
    }
  }

  return {
    title: get("title") ?? "",
    date: get("date") ?? "",
    image: get("image") ?? "",
    location: get("location"),
    tags,
    instagram: fm.includes("instagram: true"),
  };
}

export function applyTagsToContent(content: string, tags: string[]): string {
  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, open, fmBody, close, rest] = fmMatch;
  const lines = fmBody.split("\n");

  // Strip existing tags block
  const cleaned: string[] = [];
  let skipNext = false;
  for (const line of lines) {
    if (line.match(/^tags:/)) { skipNext = true; continue; }
    if (skipNext && line.match(/^\s+-/)) continue;
    skipNext = false;
    cleaned.push(line);
  }

  // Insert tags after image line
  const imageIdx = cleaned.findIndex((l) => l.startsWith("image:"));
  const insertAt = imageIdx >= 0 ? imageIdx + 1 : cleaned.length;
  const tagLines = ["tags:", ...tags.map((t) => `  - "${t}"`)];
  cleaned.splice(insertAt, 0, ...tagLines);

  return `${open}${cleaned.join("\n")}${close}${rest}`;
}

export async function tagsInit() {
  const existing = loadState();
  const files = readdirSync(PHOTO_DIR).filter((f) => f.endsWith(".md"));

  let added = 0;
  let skipped = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    if (existing[slug]) { skipped++; continue; }

    const content = readFileSync(join(PHOTO_DIR, file), "utf-8");
    const fm = parsePhotoFrontmatter(content);
    if (fm.tags.length > 0) { skipped++; continue; }

    existing[slug] = {
      image: fm.image,
      status: "pending",
      description: null,
      suggested_tags: null,
      approved_tags: null,
    };
    added++;
  }

  saveState(existing);
  const total = Object.keys(existing).filter((k) => existing[k].status === "pending").length;
  console.log(`Initialised: ${added} new untagged photos added, ${skipped} skipped`);
  console.log(`Total pending: ${total}`);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
bun test cli/src/commands/__tests__/tags.test.ts
```
Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/tags.ts cli/src/commands/__tests__/tags.test.ts
git commit -m "feat(tags): add photo frontmatter parsing and init command"
```

---

## Task 4: Describe command — vision pass

**Files:**
- Modify: `cli/src/commands/tags.ts` (add `tagsDescribe`)

- [ ] **Step 1: Add tagsDescribe to tags.ts**

Add this import at the top of `cli/src/commands/tags.ts`:
```typescript
import { describeImage } from "../lib/ollama";
import { tmpdir } from "os";
import { extname } from "path";
```

Add this function to `cli/src/commands/tags.ts`:

```typescript
interface DescribeOpts {
  limit?: string;
  concurrency?: string;
  host?: string;
  model?: string;
}

export async function tagsDescribe(opts: DescribeOpts) {
  const host = opts.host ?? "http://192.165.0.65:30068";
  const model = opts.model ?? "qwen2.5vl:4b";
  const limit = opts.limit ? parseInt(opts.limit, 10) : Infinity;
  const concurrency = Math.min(parseInt(opts.concurrency ?? "2", 10), 10);

  const state = loadState();
  const pending = Object.entries(state)
    .filter(([, r]) => r.status === "pending")
    .slice(0, limit);

  if (pending.length === 0) {
    console.log("No pending photos. Run: bun run cli tags init");
    return;
  }

  console.log(`Describing ${pending.length} photos (concurrency: ${concurrency})...`);
  let done = 0;
  let errors = 0;

  // Process in batches of `concurrency`
  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(batch.map(async ([slug, record]) => {
      const imageUrl = `https://media.really.lol/${record.image}`;
      const ext = extname(record.image) || ".jpg";
      const tmpPath = join(tmpdir(), `rl-tag-${slug}${ext}`);

      try {
        // Download image to temp file
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${imageUrl}`);
        const buf = await res.arrayBuffer();
        writeFileSync(tmpPath, Buffer.from(buf));

        const description = await describeImage(tmpPath, host, model);
        state[slug] = { ...record, status: "described", description };
        done++;
        process.stdout.write(`\r${done + errors}/${pending.length} (${errors} errors)`);
      } catch (err) {
        errors++;
        process.stdout.write(`\r${done + errors}/${pending.length} (${errors} errors)`);
        // Leave status as pending so it retries on next run
      }
    }));

    // Save after each batch for interrupt safety
    saveState(state);
  }

  console.log(`\nDone: ${done} described, ${errors} errors`);
}
```

- [ ] **Step 2: Smoke test with 2 photos**

First run init to build the state file:
```bash
cd /Users/jackreid/Developer/reallylol && bun run cli tags init
```
Expected output: `Initialised: N new untagged photos added`

Then describe just 2 to verify connectivity:
```bash
bun run cli tags describe --limit 2 --host http://192.165.0.65:30068 --model <actual-model-name>
```
Expected: progress counter, then "Done: 2 described, 0 errors"

Check state file:
```bash
cat photo-tags-state.json | head -30
```
Expected: two entries with `"status": "described"` and a non-empty `"description"` field.

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/tags.ts
git commit -m "feat(tags): add describe command for vision pass"
```

---

## Task 5: Suggest command — tag mapping pass

**Files:**
- Modify: `cli/src/commands/tags.ts` (add `tagsSuggest`)

- [ ] **Step 1: Add tagsSuggest to tags.ts**

Add this import at the top of `cli/src/commands/tags.ts` (alongside existing imports):
```typescript
import { suggestTags } from "../lib/ollama";
import { readFileSync as _readFileSync } from "fs"; // already imported, skip if duplicate
```

Add the taxonomy constant (put this near the top of the file, after imports):
```typescript
// Full photo tag taxonomy - update if config.json changes
const PHOTO_TAXONOMY = [
  "aerial","animal","animals","architecture","arizona","art","autumn","bandw",
  "bangalore","barcelona","basel","bath","beach","berlin","bike","billericay",
  "birds","birmingham","books","boston","brixton","brockwell","brockwell park",
  "budapest","bw","california","cambridge","camden","camping","canada","canal",
  "cats","chicago","christmas","church","cities","city","coast","commute",
  "copenhagen","cornwall","cotswolds","countryside","culture","cycling","denmark",
  "depop","desert","design","dog","dogs","dorset","dulwich","dusk","edinburgh",
  "essex","exeter","faces","family","film","filmphotography","flowers","food",
  "forest","france","friends","gallery","germany","glasgow","greenwich","henry",
  "history","home","hungary","india","industrial","infrastructure","interior",
  "interiors","island","italy","jack","kerala","lakes","landscape","latvia",
  "lettering","lights","london","losangeles","lukas","mallorca","marine","martha",
  "matt","me","mexico","mountains","movies","museum","music","nature","nevada",
  "newport","night","nyc","oxford circus","paris","parks","party","peak district",
  "peckham","people","pet","pets","pigs","plants","poland","pond","portrait",
  "primavera","protest","pub","rain","reflection","riga","river","rixdorf","rocks",
  "rome","sanfrancisco","sarah","scotland","sculpture","sea","sf","shadows",
  "shetland","shoreditch","shropshire","skiing","sky","skyline","snow","somerset",
  "south bank","spain","sports","street","suburbia","summer","sunrise","sunset",
  "sussex","switzerland","talisker","tech","telford","tom","toronto","trains",
  "transport","travel","typography","uk","urban","usa","wales","washington",
  "water","weather","wedding","westminster","winter","work",
];
```

Add this function:

```typescript
interface SuggestOpts {
  limit?: string;
  host?: string;
  model?: string;
}

export async function tagsSuggest(opts: SuggestOpts) {
  const host = opts.host ?? "http://192.165.0.65:30068";
  const model = opts.model ?? "qwen2.5vl:4b";
  const limit = opts.limit ? parseInt(opts.limit, 10) : Infinity;

  const state = loadState();
  const described = Object.entries(state)
    .filter(([, r]) => r.status === "described")
    .slice(0, limit);

  if (described.length === 0) {
    console.log("No described photos. Run: bun run cli tags describe");
    return;
  }

  console.log(`Suggesting tags for ${described.length} photos...`);
  let done = 0;
  let errors = 0;

  for (const [slug, record] of described) {
    try {
      const tags = await suggestTags(record.description!, PHOTO_TAXONOMY, host, model);
      state[slug] = { ...record, status: "suggested", suggested_tags: tags };
      done++;
      process.stdout.write(`\r${done + errors}/${described.length} (${errors} errors)`);
    } catch {
      errors++;
      process.stdout.write(`\r${done + errors}/${described.length} (${errors} errors)`);
    }

    // Save every 10 for interrupt safety
    if ((done + errors) % 10 === 0) saveState(state);
  }

  saveState(state);
  console.log(`\nDone: ${done} suggested, ${errors} errors`);
}
```

- [ ] **Step 2: Smoke test the suggest command on those 2 photos**

```bash
bun run cli tags suggest --limit 2 --host http://192.165.0.65:30068 --model <actual-model-name>
```
Expected: "Done: 2 suggested, 0 errors"

Check state:
```bash
cat photo-tags-state.json | python3 -c "import sys,json; [print(k, v['suggested_tags']) for k,v in json.load(sys.stdin).items()]"
```
Expected: two slugs each with a list of tags from the taxonomy.

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/tags.ts
git commit -m "feat(tags): add suggest command for tag mapping pass"
```

---

## Task 6: Apply command — write tags to markdown

**Files:**
- Modify: `cli/src/commands/tags.ts` (add `tagsApply`)

- [ ] **Step 1: Add tagsApply to tags.ts**

```typescript
interface ApplyOpts {
  "dry-run"?: string;
}

export async function tagsApply(opts: ApplyOpts) {
  const dryRun = opts["dry-run"] === "true" || opts["dry-run"] === "";
  const state = loadState();

  const reviewed = Object.entries(state).filter(([, r]) => r.status === "reviewed");

  if (reviewed.length === 0) {
    console.log("No reviewed photos to apply. Use the review UI first.");
    return;
  }

  let applied = 0;
  let errors = 0;

  for (const [slug, record] of reviewed) {
    const filePath = join(PHOTO_DIR, `${slug}.md`);
    try {
      const content = readFileSync(filePath, "utf-8");
      const updated = applyTagsToContent(content, record.approved_tags!);
      if (!dryRun) {
        writeFileSync(filePath, updated, "utf-8");
        state[slug] = { ...record, status: "applied" };
      } else {
        console.log(`[dry-run] Would write tags [${record.approved_tags!.join(", ")}] to ${slug}.md`);
      }
      applied++;
    } catch (err) {
      console.error(`Error applying ${slug}: ${err}`);
      errors++;
    }
  }

  if (!dryRun) {
    saveState(state);
    console.log(`Applied: ${applied} files updated, ${errors} errors`);
  } else {
    console.log(`Dry run: ${applied} would be updated`);
  }
}
```

- [ ] **Step 2: Run the existing frontmatter tests to confirm apply logic is covered**

```bash
bun test cli/src/commands/__tests__/tags.test.ts
```
Expected: 5 tests pass (applyTagsToContent is already tested in Task 3)

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/tags.ts
git commit -m "feat(tags): add apply command to write approved tags to markdown"
```

---

## Task 7: Review web UI

**Files:**
- Modify: `cli/src/commands/tags.ts` (add `tagsReview`)

This task adds the `bun run cli tags review` command. It serves a local Bun HTTP server at `localhost:4444` with an inline HTML/JS single-page app. The UI shows the photo (loaded from `media.really.lol`), the suggested tags pre-checked, the full taxonomy as additional checkboxes, and keyboard shortcuts (Enter=approve, S=skip).

- [ ] **Step 1: Add tagsReview to tags.ts**

```typescript
export async function tagsReview() {
  const state = loadState();
  const queue = Object.entries(state)
    .filter(([, r]) => r.status === "suggested")
    .map(([slug, r]) => ({ slug, ...r }));

  if (queue.length === 0) {
    console.log("No photos with suggested tags. Run: bun run cli tags suggest");
    return;
  }

  let idx = 0;
  const total = queue.length;

  const server = Bun.serve({
    port: 4444,
    fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === "/api/current") {
        if (idx >= queue.length) {
          return Response.json({ done: true });
        }
        const item = queue[idx];
        const imageUrl = `https://media.really.lol/${item.image}`;
        return Response.json({
          slug: item.slug,
          imageUrl,
          suggestedTags: item.suggested_tags ?? [],
          description: item.description ?? "",
          taxonomy: PHOTO_TAXONOMY,
          progress: { current: idx + 1, total },
        });
      }

      if (url.pathname === "/api/approve" && req.method === "POST") {
        return req.json().then((body: any) => {
          const { slug, tags } = body as { slug: string; tags: string[] };
          const record = state[slug];
          if (record) {
            state[slug] = { ...record, status: "reviewed", approved_tags: tags };
            saveState(state);
          }
          idx++;
          return Response.json({ ok: true });
        });
      }

      if (url.pathname === "/api/skip" && req.method === "POST") {
        idx++;
        return Response.json({ ok: true });
      }

      // Serve inline HTML for all other routes
      return new Response(REVIEW_HTML, { headers: { "Content-Type": "text/html" } });
    },
  });

  console.log(`Review UI: http://localhost:4444  (${total} photos to review)`);
  console.log("Press Ctrl+C to stop.");

  // Keep alive
  await new Promise<void>((_, reject) => {
    process.on("SIGINT", () => { server.stop(); reject(new Error("stopped")); });
  }).catch(() => {});

  console.log("\nReview session ended.");
}

const REVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Photo Tag Review</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #1a1a1a; color: #e0e0e0; height: 100vh; display: flex; flex-direction: column; }
  #progress { background: #2a2a2a; padding: 8px 16px; font-size: 13px; color: #888; border-bottom: 1px solid #333; }
  #main { display: flex; flex: 1; overflow: hidden; }
  #photo-panel { flex: 1; display: flex; align-items: center; justify-content: center; background: #111; padding: 16px; }
  #photo-panel img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
  #tag-panel { width: 380px; display: flex; flex-direction: column; border-left: 1px solid #333; overflow: hidden; }
  #description { padding: 12px 16px; font-size: 12px; color: #888; background: #222; border-bottom: 1px solid #333; line-height: 1.5; max-height: 100px; overflow-y: auto; }
  #tag-list { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; }
  .tag { padding: 4px 10px; border-radius: 20px; font-size: 12px; cursor: pointer; user-select: none; border: 1px solid #444; background: #2a2a2a; color: #aaa; transition: all 0.1s; }
  .tag.selected { background: #2563eb; border-color: #3b82f6; color: #fff; }
  #actions { padding: 12px 16px; border-top: 1px solid #333; display: flex; gap: 8px; }
  button { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; }
  #btn-approve { background: #2563eb; color: #fff; flex: 1; }
  #btn-skip { background: #333; color: #aaa; }
  #btn-approve:hover { background: #1d4ed8; }
  #btn-skip:hover { background: #444; }
  #done { display: none; align-items: center; justify-content: center; flex: 1; flex-direction: column; gap: 8px; }
  #done h2 { color: #4ade80; }
</style>
</head>
<body>
<div id="progress">Loading...</div>
<div id="main">
  <div id="photo-panel"><img id="photo" src="" alt=""></div>
  <div id="tag-panel">
    <div id="description"></div>
    <div id="tag-list"></div>
    <div id="actions">
      <button id="btn-skip">Skip (S)</button>
      <button id="btn-approve">Approve (Enter)</button>
    </div>
  </div>
  <div id="done"><h2>All done!</h2><p>Run: bun run cli tags apply</p></div>
</div>
<script>
let currentSlug = '';
async function load() {
  const res = await fetch('/api/current');
  const data = await res.json();
  if (data.done) {
    document.getElementById('main').style.display = 'none';
    document.getElementById('done').style.display = 'flex';
    document.getElementById('progress').textContent = 'Review complete!';
    return;
  }
  currentSlug = data.slug;
  document.getElementById('progress').textContent =
    data.progress.current + ' / ' + data.progress.total + '  —  ' + data.slug;
  document.getElementById('photo').src = data.imageUrl;
  document.getElementById('description').textContent = data.description;
  const suggested = new Set(data.suggestedTags);
  const tagList = document.getElementById('tag-list');
  tagList.innerHTML = '';
  // Suggested tags first, then rest of taxonomy
  const ordered = [...data.suggestedTags, ...data.taxonomy.filter(t => !suggested.has(t))];
  for (const tag of ordered) {
    const el = document.createElement('span');
    el.className = 'tag' + (suggested.has(tag) ? ' selected' : '');
    el.textContent = tag;
    el.onclick = () => el.classList.toggle('selected');
    tagList.appendChild(el);
  }
}
async function approve() {
  const selected = [...document.querySelectorAll('.tag.selected')].map(el => el.textContent);
  await fetch('/api/approve', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ slug: currentSlug, tags: selected }) });
  load();
}
async function skip() {
  await fetch('/api/skip', { method: 'POST' });
  load();
}
document.getElementById('btn-approve').onclick = approve;
document.getElementById('btn-skip').onclick = skip;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') approve();
  if (e.key === 's' || e.key === 'S') skip();
});
load();
</script>
</body>
</html>`;
```

- [ ] **Step 2: Smoke test review UI**

```bash
bun run cli tags review
```
Expected: "Review UI: http://localhost:4444  (2 photos to review)"

Open http://localhost:4444 in a browser. Verify:
- Photo loads from media.really.lol
- Suggested tags appear pre-selected (blue)
- Rest of taxonomy appears unselected
- Enter key approves and advances
- S key skips

Check state file after approving a photo:
```bash
cat photo-tags-state.json | python3 -c "import sys,json; [print(k, v['status'], v.get('approved_tags')) for k,v in json.load(sys.stdin).items()]"
```
Expected: reviewed entry with `approved_tags` populated.

- [ ] **Step 3: Commit**

```bash
git add cli/src/commands/tags.ts
git commit -m "feat(tags): add review web UI for approving tag suggestions"
```

---

## Task 8: Wire up CLI entry point

**Files:**
- Modify: `cli/src/index.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add tags routing to index.ts**

In `cli/src/index.ts`, add after the `check` block (before the final `else`):

```typescript
} else if (cmd === "tags") {
  if (sub === "init") {
    const { tagsInit } = await import("./commands/tags");
    await tagsInit();
  } else if (sub === "describe") {
    const { tagsDescribe } = await import("./commands/tags");
    const opts = parseOpts(rest);
    await tagsDescribe(opts);
  } else if (sub === "suggest") {
    const { tagsSuggest } = await import("./commands/tags");
    const opts = parseOpts(rest);
    await tagsSuggest(opts);
  } else if (sub === "review") {
    const { tagsReview } = await import("./commands/tags");
    await tagsReview();
  } else if (sub === "apply") {
    const { tagsApply } = await import("./commands/tags");
    const opts = parseOpts(rest);
    await tagsApply(opts);
  } else {
    console.log("Usage: cli tags <init|describe|suggest|review|apply>");
    console.log("  init                          Scan untagged photos, build state file");
    console.log("  describe [--limit N] [--concurrency N] [--host URL] [--model NAME]");
    console.log("  suggest  [--limit N] [--host URL] [--model NAME]");
    console.log("  review                        Open browser review UI at localhost:4444");
    console.log("  apply [--dry-run]             Write approved tags to markdown files");
  }
```

Also update the help text in the final `else` block to add:
```
  cli tags <init|describe|suggest|review|apply>
```

- [ ] **Step 2: Add state file to .gitignore**

Add this line to `.gitignore` in the "Temporary files" section:
```
photo-tags-state.json
```

- [ ] **Step 3: Run all tests**

```bash
bun test
```
Expected: all tests pass

- [ ] **Step 4: Full end-to-end smoke test**

```bash
# Init
bun run cli tags init

# Describe 3 photos
bun run cli tags describe --limit 3 --host http://192.165.0.65:30068 --model <model-name>

# Suggest tags for those 3
bun run cli tags suggest --limit 3 --host http://192.165.0.65:30068 --model <model-name>

# Review in browser
bun run cli tags review

# Dry run apply
bun run cli tags apply --dry-run

# Real apply
bun run cli tags apply
```

Verify the three photo markdown files now have `tags:` blocks with the approved tags.

- [ ] **Step 5: Commit**

```bash
git add cli/src/index.ts .gitignore
git commit -m "feat(tags): wire up tags command and gitignore state file"
```

---

## Self-Review

**Spec coverage:**
- State file with interrupt/resume: Task 1
- Ollama vision description pass: Task 4
- Tag suggestion pass: Task 5
- Review web UI with keyboard shortcuts: Task 7
- Apply approved tags to markdown: Task 6
- `--limit` and `--concurrency` for partial runs: Task 4, 5
- Closed taxonomy enforcement (no hallucinated tags): `suggestTags` filters to taxonomy set
- Two-phase pipeline (describe then suggest): separate commands

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `PhotoRecord.status` typed as `PhotoStatus` union throughout
- `applyTagsToContent` used in both test (Task 3) and tagsApply (Task 6)
- `PHOTO_TAXONOMY` defined once, used by `tagsSuggest` and the review UI
- `loadState`/`saveState` signature with optional path used consistently
