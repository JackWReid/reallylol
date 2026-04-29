import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { extname } from "path";
import { loadState, saveState, type PhotoState } from "../lib/photo-state";
import { describeImage, suggestTags } from "../lib/ollama";

const PHOTO_DIR = "site/src/content/photo";

// Full photo tag taxonomy — update if tags evolve
const PHOTO_TAXONOMY = [
  "aerial","animal","animals","architecture","arizona","art","autumn","bandw",
  "aerial","animals","architecture","arizona","art","autumn",
  "bangalore","barcelona","basel","bath","beach","berlin","bike","billericay",
  "birds","birmingham","black-and-white","books","boston","brixton","brockwell-park",
  "budapest","california","cambridge","camden","canada","canal",
  "cats","chicago","christmas","church","cities","coast","commute",
  "copenhagen","cornwall","cotswolds","countryside","culture","cycling","denmark",
  "depop","desert","design","dogs","dorset","dulwich","dusk","edinburgh",
  "essex","exeter","faces","family","film","film-photography","flowers","food",
  "forest","france","friends","gallery","germany","glasgow","greenwich",
  "history","home","hungary","india","industrial","infrastructure",
  "interiors","island","italy","kerala","lakes","landscape","las-vegas","latvia",
  "lights","london","los-angeles","mallorca","me","mexico","mountains","museums","music",
  "nature","nevada","new-york-city","newport","night","outdoors","oxford-circus",
  "paris","parks","party","peak-district","peckham","people",
  "person-emma","person-henry","person-jack","person-lizzie","person-lukas",
  "person-martha","person-matt","person-sarah","person-tom",
  "pets","plants","poland","primavera","protest","pub","rain","reflection",
  "riga","rixdorf","rome","san-francisco","scotland","sea","shadows",
  "shetland","shoreditch","shropshire","skiing","sky","snow","somerset",
  "south-bank","spain","sports","street","suburbia","summer","sunrise","sunset",
  "sussex","switzerland","talisker","tech","telford","toronto","trains",
  "transport","travel","typography","uk","usa","wales","washington",
  "water","weather","wedding","westminster","winter","work",
];

// --- Frontmatter helpers (exported for tests) ---

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

  // Strip any existing tags block
  const cleaned: string[] = [];
  let inTagsBlock = false;
  for (const line of lines) {
    if (line.match(/^tags:/)) { inTagsBlock = true; continue; }
    if (inTagsBlock && line.match(/^\s+-/)) continue;
    inTagsBlock = false;
    cleaned.push(line);
  }

  // Insert tags after the image line (or at end if no image line)
  const imageIdx = cleaned.findIndex((l) => l.startsWith("image:"));
  const insertAt = imageIdx >= 0 ? imageIdx + 1 : cleaned.length;
  const tagLines = ["tags:", ...tags.map((t) => `  - "${t}"`)];
  cleaned.splice(insertAt, 0, ...tagLines);

  return `${open}${cleaned.join("\n")}${close}${rest}`;
}

// --- Commands ---

export async function tagsInit() {
  const existing = loadState();
  const files = readdirSync(PHOTO_DIR).filter((f) => f.endsWith(".md"));

  let added = 0;
  let skipped = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    if (existing[slug]) { skipped++; continue; }

    const content = readFileSync(join(PHOTO_DIR, file), "utf-8");
    let fm: PhotoFrontmatter;
    try {
      fm = parsePhotoFrontmatter(content);
    } catch {
      skipped++;
      continue;
    }

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
  const total = Object.values(existing).filter((r) => r.status === "pending").length;
  console.log(`Initialised: ${added} new untagged photos added, ${skipped} skipped`);
  console.log(`Total pending: ${total}`);
}

interface DescribeOpts {
  limit?: string;
  concurrency?: string;
  host?: string;
  model?: string;
}

export async function tagsDescribe(opts: DescribeOpts) {
  const host = opts.host ?? "http://192.168.0.65:30068";
  const model = opts.model ?? "qwen3-vl:4b";
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

  console.log(`Describing ${pending.length} photos (concurrency: ${concurrency}, model: ${model})...`);
  let done = 0;
  let errors = 0;

  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(batch.map(async ([slug, record]) => {
      const imageUrl = `https://media.really.lol/${record.image}`;
      const ext = extname(record.image) || ".jpg";
      const tmpPath = join(tmpdir(), `rl-tag-${slug}${ext}`);

      try {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${imageUrl}`);
        writeFileSync(tmpPath, Buffer.from(await res.arrayBuffer()));

        const description = await describeImage(tmpPath, host, model);
        state[slug] = { ...record, status: "described", description };
        done++;
      } catch (err) {
        errors++;
        process.stderr.write(`\nError on ${slug}: ${err}\n`);
      }
      process.stdout.write(`\r${done + errors}/${pending.length} (${errors} errors)   `);
    }));

    saveState(state);
  }

  console.log(`\nDone: ${done} described, ${errors} errors`);
}

interface SuggestOpts {
  limit?: string;
  host?: string;
  model?: string;
}

export async function tagsSuggest(opts: SuggestOpts) {
  const host = opts.host ?? "http://192.168.0.65:30068";
  const model = opts.model ?? "qwen3:0.6b";
  const limit = opts.limit ? parseInt(opts.limit, 10) : Infinity;

  const state = loadState();
  const described = Object.entries(state)
    .filter(([, r]) => r.status === "described")
    .slice(0, limit);

  if (described.length === 0) {
    console.log("No described photos. Run: bun run cli tags describe");
    return;
  }

  console.log(`Suggesting tags for ${described.length} photos (model: ${model})...`);
  let done = 0;
  let errors = 0;

  for (const [slug, record] of described) {
    try {
      const tags = await suggestTags(record.description!, PHOTO_TAXONOMY, host, model);
      state[slug] = { ...record, status: "suggested", suggested_tags: tags };
      done++;
    } catch (err) {
      errors++;
      process.stderr.write(`\nError on ${slug}: ${err}\n`);
    }
    process.stdout.write(`\r${done + errors}/${described.length} (${errors} errors)   `);

    if ((done + errors) % 10 === 0) saveState(state);
  }

  saveState(state);
  console.log(`\nDone: ${done} suggested, ${errors} errors`);
}

interface ApplyOpts {
  "dry-run"?: string;
}

export async function tagsApply(opts: ApplyOpts) {
  const dryRun = "dry-run" in opts;
  const state = loadState();
  const reviewed = Object.entries(state).filter(([, r]) => r.status === "reviewed");

  if (reviewed.length === 0) {
    console.log("No reviewed photos to apply. Use: bun run cli tags review");
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
        console.log(`[dry-run] ${slug}: [${record.approved_tags!.join(", ")}]`);
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
    console.log(`\nDry run complete: ${applied} would be updated`);
  }
}

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
        return Response.json({
          slug: item.slug,
          imageUrl: `https://media.really.lol/${item.image}`,
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

      return new Response(REVIEW_HTML, { headers: { "Content-Type": "text/html" } });
    },
  });

  console.log(`Review UI: http://localhost:4444  (${total} photos to review)`);
  console.log("Keyboard: Enter = approve, S = skip, Ctrl+C = stop");

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
  body { font-family: 'IBM Plex Sans', system-ui, sans-serif; background: #1a1a1a; color: #e0e0e0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  #progress { background: #2a2a2a; padding: 8px 16px; font-size: 13px; color: #888; border-bottom: 1px solid #333; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; }
  #slug { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #555; }
  #main { display: flex; flex: 1; overflow: hidden; }
  #photo-panel { flex: 1; display: flex; align-items: center; justify-content: center; background: #111; padding: 16px; min-width: 0; }
  #photo-panel img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; }
  #tag-panel { width: 360px; flex-shrink: 0; display: flex; flex-direction: column; border-left: 1px solid #333; overflow: hidden; }
  #description { padding: 10px 14px; font-size: 12px; color: #777; background: #222; border-bottom: 1px solid #333; line-height: 1.5; max-height: 90px; overflow-y: auto; flex-shrink: 0; font-style: italic; }
  #tag-list { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-wrap: wrap; gap: 5px; align-content: flex-start; }
  .tag { padding: 3px 9px; border-radius: 20px; font-size: 12px; cursor: pointer; user-select: none; border: 1px solid #3a3a3a; background: #252525; color: #999; transition: background 0.1s, border-color 0.1s, color 0.1s; }
  .tag:hover { border-color: #555; color: #ccc; }
  .tag.selected { background: #1d3a6e; border-color: #2563eb; color: #93bbf7; }
  .tag.separator { width: 100%; height: 0; border: none; border-top: 1px solid #333; margin: 4px 0; cursor: default; background: none; padding: 0; }
  #actions { padding: 10px 14px; border-top: 1px solid #333; display: flex; gap: 8px; flex-shrink: 0; }
  button { padding: 8px 14px; border-radius: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit; }
  #btn-approve { background: #2563eb; color: #fff; flex: 1; }
  #btn-skip { background: #2a2a2a; color: #777; border: 1px solid #444; }
  #btn-approve:hover { background: #1d4ed8; }
  #btn-skip:hover { background: #333; }
  #done-panel { display: none; align-items: center; justify-content: center; flex: 1; flex-direction: column; gap: 12px; }
  #done-panel h2 { color: #4ade80; font-size: 20px; }
  #done-panel p { color: #666; font-size: 14px; font-family: 'IBM Plex Mono', monospace; }
</style>
</head>
<body>
<div id="progress">
  <span id="progress-text">Loading...</span>
  <span id="slug"></span>
</div>
<div id="main">
  <div id="photo-panel"><img id="photo" src="" alt="" loading="eager"></div>
  <div id="tag-panel">
    <div id="description"></div>
    <div id="tag-list"></div>
    <div id="actions">
      <button id="btn-skip">Skip (S)</button>
      <button id="btn-approve">Approve &amp; next (Enter)</button>
    </div>
  </div>
  <div id="done-panel">
    <h2>All done!</h2>
    <p>bun run cli tags apply</p>
  </div>
</div>
<script>
let currentSlug = '';

async function load() {
  const res = await fetch('/api/current');
  const data = await res.json();
  if (data.done) {
    document.getElementById('main').style.display = 'none';
    document.getElementById('done-panel').style.display = 'flex';
    document.getElementById('progress-text').textContent = 'Review complete!';
    document.getElementById('slug').textContent = '';
    return;
  }

  currentSlug = data.slug;
  document.getElementById('progress-text').textContent =
    data.progress.current + ' / ' + data.progress.total;
  document.getElementById('slug').textContent = data.slug;
  document.getElementById('photo').src = data.imageUrl;
  document.getElementById('description').textContent = data.description;

  const suggested = new Set(data.suggestedTags);
  const tagList = document.getElementById('tag-list');
  tagList.innerHTML = '';

  // Suggested tags first (pre-selected), separator, then rest
  const rest = data.taxonomy.filter(t => !suggested.has(t));
  for (const tag of data.suggestedTags) {
    const el = document.createElement('span');
    el.className = 'tag selected';
    el.textContent = tag;
    el.onclick = () => el.classList.toggle('selected');
    tagList.appendChild(el);
  }
  if (data.suggestedTags.length > 0 && rest.length > 0) {
    const sep = document.createElement('span');
    sep.className = 'tag separator';
    tagList.appendChild(sep);
  }
  for (const tag of rest) {
    const el = document.createElement('span');
    el.className = 'tag';
    el.textContent = tag;
    el.onclick = () => el.classList.toggle('selected');
    tagList.appendChild(el);
  }
}

async function approve() {
  const selected = [...document.querySelectorAll('.tag.selected')].map(el => el.textContent.trim()).filter(Boolean);
  await fetch('/api/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: currentSlug, tags: selected }),
  });
  load();
}

async function skip() {
  await fetch('/api/skip', { method: 'POST' });
  load();
}

document.getElementById('btn-approve').onclick = approve;
document.getElementById('btn-skip').onclick = skip;

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); approve(); }
  if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) { e.preventDefault(); skip(); }
});

load();
</script>
</body>
</html>`;
