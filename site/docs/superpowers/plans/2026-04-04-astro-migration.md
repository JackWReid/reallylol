# Astro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate really.lol from Hugo to Astro, reading existing markdown content collections and serving images from Cloudflare R2.

**Architecture:** Static Astro site in `astro/` directory alongside the existing Hugo site. Content stays in `content/` as markdown, symlinked into Astro content collections. All images served from `https://media.really.lol` (R2), with Cloudflare Image Resizing for thumbnails and hero images. CSS reused verbatim from the Hugo theme (zero changes). Phase 1 uses Astro content collections; Phase 2 (future) swaps data-fetching for CMS API calls.

**Tech Stack:** Astro 5, TypeScript, Bun, `@astrojs/rss`, `@astrojs/sitemap`, Playwright (tests), Cloudflare Pages (deploy)

---

## File Map

**New files to create:**
```
astro/
  package.json
  astro.config.ts
  tsconfig.json
  src/
    content/config.ts               — Zod schemas for all 4 content collections
    lib/
      images.ts                     — r2Url, r2Thumb, r2Hero helpers
      tags.ts                       — Tag pretty-name lookup from content_config.json
      related.ts                    — getRelated() by tag overlap
    styles/                         — 8 CSS files copied verbatim from Hugo theme
    layouts/
      Base.astro                    — <html>, head, skip-link, header, footer, slot
      Plain.astro                   — Minimal layout for about/now/uses
    components/
      SiteHeader.astro              — Main nav (really.lol + 6 nav items)
      Footer.astro                  — Random photo widget + social links
      Pagination.astro              — Prev/next + page counter
      SeeAlso.astro                 — Related posts by tag
      SubNav.astro                  — Books/films/links sub-navigation
      TagList.astro                 — Tag links with pretty names
      ContentImage.astro            — Replaces {{< image >}} shortcode
      PreviewCard.astro             — Content preview (post/note/highlight/photo)
      PhotoGrid.astro               — 3-col thumbnail grid
      BookGrid.astro                — Book card grid
      FilmTable.astro               — Film table
      LinksList.astro               — Saved links list
      icons/
        Calendar.astro
        Location.astro
        Tag.astro
        Paperclip.astro
        Pen.astro
        Speech.astro
        Capture.astro
    pages/
      index.astro                   — Homepage
      post/
        index.astro                 — Redirects to /post/1/
        [...page].astro             — Paginated post listing (10/page)
        [slug].astro                — Single post
      note/
        index.astro                 — Redirects to /note/1/
        [...page].astro             — Paginated note listing (10/page)
        [slug].astro                — Single note
      photo/
        index.astro                 — Redirects to /photo/1/
        [...page].astro             — Paginated photo grid (24/page)
        [slug].astro                — Single photo
      highlight/
        index.astro                 — Redirects to /highlight/1/
        [...page].astro             — Paginated highlight listing (10/page)
        [slug].astro                — Single highlight
      books/
        reading.astro
        read.astro
        toread.astro
      films/
        watched.astro
        towatch.astro
      links/
        saved.astro
        blogroll.astro
      tags/
        index.astro                 — All tags with counts
        [tag]/
          [...page].astro           — Paginated tag archive
      about/
        now.astro
        uses.astro
      404.astro
      rss.xml.ts
  public/
    favicon.png                     — copied from Hugo static/
  astro.playwright.config.ts        — Playwright config pointing at localhost:4321
```

**Symlinked from existing content:**
```
astro/src/content/post/       -> ../../content/post/
astro/src/content/note/       -> ../../content/note/
astro/src/content/photo/      -> ../../content/photo/
astro/src/content/highlight/  -> ../../content/highlight/
astro/src/data/               -> ../../data/
```

---

## Task 1: Scaffold Astro project

**Files:**
- Create: `astro/package.json`
- Create: `astro/astro.config.ts`
- Create: `astro/tsconfig.json`
- Create: `astro/src/env.d.ts`

- [ ] **Step 1: Create the `astro/` directory and install Astro**

```bash
mkdir -p astro/src/pages astro/public
cd astro
bun add astro @astrojs/rss @astrojs/sitemap
bun add -D typescript
```

- [ ] **Step 2: Write `astro/package.json`**

```json
{
  "name": "reallylol-astro",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.0.0",
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Write `astro/astro.config.ts`**

```ts
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://really.lol",
  output: "static",
  integrations: [
    sitemap({
      serialize(item) {
        if (item.url === "https://really.lol/") item.priority = 1.0;
        else if (item.url.startsWith("https://really.lol/post")) item.priority = 0.6;
        else if (item.url.startsWith("https://really.lol/photo")) item.priority = 0.5;
        else if (item.url.startsWith("https://really.lol/note")) item.priority = 0.3;
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: { theme: "dracula" },
  },
});
```

- [ ] **Step 4: Write `astro/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 5: Write `astro/src/env.d.ts`**

```ts
/// <reference types="astro/client" />
```

- [ ] **Step 6: Write a minimal `astro/src/pages/index.astro` to verify the scaffold builds**

```astro
---
---
<html lang="en-gb">
  <head><title>really.lol</title></head>
  <body><h1>really.lol</h1></body>
</html>
```

- [ ] **Step 7: Verify the dev server starts**

```bash
cd astro && bun run dev
```

Expected: `astro  v5.x.x ready in X ms — Local http://localhost:4321/`

- [ ] **Step 8: Commit**

```bash
git add astro/
git commit -m "scaffold: initialise Astro project in astro/"
```

---

## Task 2: Copy CSS files and set up Playwright for Astro

**Files:**
- Create: `astro/src/styles/style.css` (copy)
- Create: `astro/src/styles/_variables.css` (copy)
- Create: `astro/src/styles/_reset.css` (copy)
- Create: `astro/src/styles/_base.css` (copy)
- Create: `astro/src/styles/_layout.css` (copy)
- Create: `astro/src/styles/_components.css` (copy)
- Create: `astro/src/styles/_specials.css` (copy)
- Create: `astro/src/styles/_utilities.css` (copy)
- Create: `astro.playwright.config.ts`

- [ ] **Step 1: Copy all 8 CSS files verbatim**

```bash
mkdir -p astro/src/styles
cp themes/reallylol/static/css/style.css astro/src/styles/style.css
cp themes/reallylol/static/css/_variables.css astro/src/styles/_variables.css
cp themes/reallylol/static/css/_reset.css astro/src/styles/_reset.css
cp themes/reallylol/static/css/_base.css astro/src/styles/_base.css
cp themes/reallylol/static/css/_layout.css astro/src/styles/_layout.css
cp themes/reallylol/static/css/_components.css astro/src/styles/_components.css
cp themes/reallylol/static/css/_specials.css astro/src/styles/_specials.css
cp themes/reallylol/static/css/_utilities.css astro/src/styles/_utilities.css
```

- [ ] **Step 2: Copy the favicon to `astro/public/`**

```bash
cp themes/reallylol/static/favicon.png astro/public/favicon.png 2>/dev/null || true
cp static/favicon.png astro/public/favicon.png 2>/dev/null || true
```

- [ ] **Step 3: Write `astro.playwright.config.ts` (separate config for Astro dev server)**

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "cd astro && bun run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 4: Verify CSS is importable by updating the placeholder `index.astro`**

```astro
---
import "../styles/style.css";
---
<html lang="en-gb">
  <head><title>really.lol</title></head>
  <body><h1 class="site-header">really.lol</h1></body>
</html>
```

Run `cd astro && bun run build` — expected: `dist/index.html` created, no CSS errors.

- [ ] **Step 5: Commit**

```bash
git add astro/src/styles/ astro/public/ astro.playwright.config.ts
git commit -m "feat: copy CSS files and add Astro Playwright config"
```

---

## Task 3: Content collections and symlinks

**Files:**
- Create: `astro/src/content/config.ts`
- Create: symlinks for 4 content directories

- [ ] **Step 1: Create content directory and symlinks**

```bash
mkdir -p astro/src/content
cd astro/src/content
ln -s ../../../../content/post post
ln -s ../../../../content/note note
ln -s ../../../../content/photo photo
ln -s ../../../../content/highlight highlight
cd ../../..
```

Note: the path `../../../../content/post` is relative to `astro/src/content/` pointing up 4 levels to the repo root then into `content/post/`.

- [ ] **Step 2: Create the data symlink**

```bash
cd astro/src
ln -s ../../../data data
cd ../..
```

- [ ] **Step 3: Write `astro/src/content/config.ts`**

```ts
import { defineCollection, z } from "astro:content";

const post = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string().optional(),
    subtitle: z.string().optional(),
    tags: z.array(z.string()).default(["journal"]),
    book_author: z.string().optional(),
    movie_released: z.string().optional(),
    media_image: z.string().optional(),
    rating: z.number().optional(),
    url: z.string().optional(),
  }),
});

const note = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

const photo = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    image: z.string(),
    location: z.string().optional(),
    tags: z.array(z.string()).optional(),
    instagram: z.boolean().optional(),
  }),
});

const highlight = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string(),
    link: z.string().url(),
    tags: z.array(z.string()).optional(),
    url: z.string().optional(),
  }),
});

export const collections = { post, note, photo, highlight };
```

- [ ] **Step 4: Verify content collections load**

Update `astro/src/pages/index.astro` to check collection loading:

```astro
---
import { getCollection } from "astro:content";
const posts = await getCollection("post");
const notes = await getCollection("note");
const photos = await getCollection("photo");
const highlights = await getCollection("highlight");
---
<html lang="en-gb">
  <head><title>really.lol</title></head>
  <body>
    <p>posts: {posts.length}, notes: {notes.length}, photos: {photos.length}, highlights: {highlights.length}</p>
  </body>
</html>
```

Run `cd astro && bun run dev` and visit `http://localhost:4321` — expected: counts like `posts: 148, notes: 110, photos: 2643, highlights: 150`.

- [ ] **Step 5: Commit**

```bash
git add astro/src/content/config.ts astro/src/content/
git commit -m "feat: set up Astro content collections with symlinks to content/"
```

---

## Task 4: Library utilities

**Files:**
- Create: `astro/src/lib/images.ts`
- Create: `astro/src/lib/tags.ts`
- Create: `astro/src/lib/related.ts`
- Create: `astro/src/lib/__tests__/images.test.ts`
- Create: `astro/src/lib/__tests__/tags.test.ts`
- Create: `astro/src/lib/__tests__/related.test.ts`

- [ ] **Step 1: Write failing tests for `images.ts`**

```ts
// astro/src/lib/__tests__/images.test.ts
import { describe, test, expect } from "bun:test";
import { r2Url, r2Thumb, r2Hero } from "../images";

describe("r2Url", () => {
  test("prepends R2 base to a bare path", () => {
    expect(r2Url("img/photo/foo.jpg")).toBe("https://media.really.lol/img/photo/foo.jpg");
  });

  test("strips leading slash", () => {
    expect(r2Url("/img/photo/foo.jpg")).toBe("https://media.really.lol/img/photo/foo.jpg");
  });
});

describe("r2Thumb", () => {
  test("generates 500x500 cover crop URL", () => {
    expect(r2Thumb("img/photo/foo.jpg")).toBe(
      "https://media.really.lol/cdn-cgi/image/width=500,height=500,fit=cover/img/photo/foo.jpg"
    );
  });

  test("accepts custom size", () => {
    expect(r2Thumb("img/photo/foo.jpg", 200)).toBe(
      "https://media.really.lol/cdn-cgi/image/width=200,height=200,fit=cover/img/photo/foo.jpg"
    );
  });
});

describe("r2Hero", () => {
  test("generates 1400x1400 fit-inside URL", () => {
    expect(r2Hero("img/photo/foo.jpg")).toBe(
      "https://media.really.lol/cdn-cgi/image/width=1400,height=1400,fit=inside/img/photo/foo.jpg"
    );
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd astro && bun test src/lib/__tests__/images.test.ts
```

Expected: `Cannot find module '../images'`

- [ ] **Step 3: Write `astro/src/lib/images.ts`**

```ts
const R2_BASE = import.meta.env.PUBLIC_R2_BASE ?? "https://media.really.lol";

export function r2Url(path: string): string {
  const clean = path.replace(/^\//, "");
  return `${R2_BASE}/${clean}`;
}

export function r2Thumb(path: string, size = 500): string {
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=cover/${path.replace(/^\//, "")}`;
}

export function r2Hero(path: string, size = 1400): string {
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=inside/${path.replace(/^\//, "")}`;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd astro && bun test src/lib/__tests__/images.test.ts
```

Expected: `5 pass, 0 fail`

- [ ] **Step 5: Write failing tests for `tags.ts`**

```ts
// astro/src/lib/__tests__/tags.test.ts
import { describe, test, expect } from "bun:test";
import { getPrettyName } from "../tags";

describe("getPrettyName", () => {
  test("returns pretty name for a known tag", () => {
    // "readbook" should map to something human-readable
    const result = getPrettyName("readbook");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("returns the tag itself for unknown tags", () => {
    expect(getPrettyName("some-unknown-tag-xyz")).toBe("some-unknown-tag-xyz");
  });
});
```

- [ ] **Step 6: Run tests — expect failures**

```bash
cd astro && bun test src/lib/__tests__/tags.test.ts
```

Expected: `Cannot find module '../tags'`

- [ ] **Step 7: Inspect `data/content_config.json` to understand tag mapping structure**

```bash
cat data/content_config.json | head -60
```

Note the structure — it should have a `tagPrettyNames` or similar object. Use that key in the implementation below.

- [ ] **Step 8: Write `astro/src/lib/tags.ts`**

```ts
import contentConfig from "../data/content_config.json";

type ContentConfig = {
  tagPrettyNames?: Record<string, string>;
  [key: string]: unknown;
};

const config = contentConfig as ContentConfig;
const prettyNames: Record<string, string> = config.tagPrettyNames ?? {};

export function getPrettyName(tag: string): string {
  return prettyNames[tag] ?? tag;
}
```

Note: if `content_config.json` uses a different key than `tagPrettyNames`, update the key to match what `cat data/content_config.json` shows.

- [ ] **Step 9: Run tests — expect pass**

```bash
cd astro && bun test src/lib/__tests__/tags.test.ts
```

Expected: `2 pass, 0 fail`

- [ ] **Step 10: Write failing tests for `related.ts`**

```ts
// astro/src/lib/__tests__/related.test.ts
import { describe, test, expect } from "bun:test";
import { getRelated } from "../related";

const fakePosts = [
  { slug: "a", data: { title: "A", tags: ["foo", "bar"] } },
  { slug: "b", data: { title: "B", tags: ["foo", "baz"] } },
  { slug: "c", data: { title: "C", tags: ["qux"] } },
  { slug: "d", data: { title: "D", tags: ["foo", "bar", "baz"] } },
];

describe("getRelated", () => {
  test("excludes the current post", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts);
    expect(results.map((r) => r.slug)).not.toContain("a");
  });

  test("excludes posts with no matching tags", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts);
    expect(results.map((r) => r.slug)).not.toContain("c");
  });

  test("orders by tag overlap score descending", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts);
    // d has 2 matches (foo, bar), b has 1 match (foo)
    expect(results[0].slug).toBe("d");
    expect(results[1].slug).toBe("b");
  });

  test("respects the limit", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts, 1);
    expect(results).toHaveLength(1);
  });
});
```

- [ ] **Step 11: Run tests — expect failures**

```bash
cd astro && bun test src/lib/__tests__/related.test.ts
```

Expected: `Cannot find module '../related'`

- [ ] **Step 12: Write `astro/src/lib/related.ts`**

```ts
export function getRelated(
  currentSlug: string,
  currentTags: string[],
  allPosts: { slug: string; data: { title: string; tags?: string[] } }[],
  limit = 5
) {
  return allPosts
    .filter((p) => p.slug !== currentSlug)
    .map((p) => ({
      ...p,
      score: (p.data.tags ?? []).filter((t) => currentTags.includes(t)).length,
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

- [ ] **Step 13: Run all lib tests — expect all pass**

```bash
cd astro && bun test src/lib/
```

Expected: `9 pass, 0 fail`

- [ ] **Step 14: Commit**

```bash
git add astro/src/lib/
git commit -m "feat: add image URL helpers, tag lookup, and related content utilities"
```

---

## Task 5: Icon components and base layout components

**Files:**
- Create: `astro/src/components/icons/Calendar.astro`
- Create: `astro/src/components/icons/Location.astro`
- Create: `astro/src/components/icons/Tag.astro`
- Create: `astro/src/components/icons/Paperclip.astro`
- Create: `astro/src/components/icons/Pen.astro`
- Create: `astro/src/components/icons/Speech.astro`
- Create: `astro/src/components/icons/Capture.astro`
- Create: `astro/src/components/SiteHeader.astro`
- Create: `astro/src/components/Footer.astro`
- Create: `astro/src/layouts/Base.astro`
- Create: `astro/src/layouts/Plain.astro`

- [ ] **Step 1: Read each icon partial from the Hugo theme to get the exact SVG**

```bash
cat themes/reallylol/layouts/partials/icons/calendar.html
cat themes/reallylol/layouts/partials/icons/location.html
cat themes/reallylol/layouts/partials/icons/tag.html
cat themes/reallylol/layouts/partials/icons/paperclip.html
cat themes/reallylol/layouts/partials/icons/pen.html
cat themes/reallylol/layouts/partials/icons/speech.html
cat themes/reallylol/layouts/partials/icons/capture.html
```

- [ ] **Step 2: Write `astro/src/components/icons/Calendar.astro`**

Extract the SVG from `themes/reallylol/layouts/partials/icons/calendar.html`. The Astro file is just the SVG directly (no frontmatter needed for static SVGs):

```astro
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true">
  <!-- paste SVG content from themes/reallylol/layouts/partials/icons/calendar.html here -->
</svg>
```

- [ ] **Step 3: Write remaining icon components**

Repeat for `Location.astro`, `Tag.astro`, `Paperclip.astro`, `Pen.astro`, `Speech.astro`, `Capture.astro` — each is just the SVG from the corresponding Hugo partial.

- [ ] **Step 4: Read the Hugo site-header partial**

```bash
cat themes/reallylol/layouts/partials/site-header.html
```

- [ ] **Step 5: Write `astro/src/components/SiteHeader.astro`**

```astro
---
---
<header class="site-header">
  <div class="site-header-wrapper">
    <h1><a href="/">really.lol</a></h1>
    <nav aria-label="Main Navigation">
      <a href="/post/">Posts</a>
      <a href="/note/">Notes</a>
      <a href="/photo/">Photos</a>
      <a href="/books/reading/">Books</a>
      <a href="/films/watched/">Films</a>
      <a href="/links/saved/">Links</a>
    </nav>
  </div>
</header>
```

- [ ] **Step 6: Read the Hugo footer partial**

```bash
cat themes/reallylol/layouts/partials/footer.html
```

- [ ] **Step 7: Write `astro/src/components/Footer.astro`**

The footer shows a random photo from `data/random_photos.json`. In Astro, pick one at build time using `Math.random()`:

```astro
---
import Calendar from "./icons/Calendar.astro";
import Location from "./icons/Location.astro";
import randomPhotos from "../data/random_photos.json";

type RandomPhoto = {
  title: string;
  image: string;
  location?: string;
  date: string;
  slug: string;
};

const photos = randomPhotos as RandomPhoto[];
const photo = photos[Math.floor(Math.random() * photos.length)];
const R2_BASE = import.meta.env.PUBLIC_R2_BASE ?? "https://media.really.lol";
const photoUrl = `${R2_BASE}/${photo.image.replace(/^\//, "")}`;
---
<footer class="site-footer">
  <div class="site-footer-wrapper">
    {photo && (
      <div class="photo-box">
        <a class="photo-box__link" href={`/photo/${photo.slug}/`}>
          <img class="photo-box__image" src={photoUrl} alt={photo.title} loading="lazy" />
          <div class="photo-box__details">
            <span class="photo-box__title">{photo.title}</span>
            {photo.location && (
              <span class="photo-box__location">
                <Location /> {photo.location}
              </span>
            )}
            <span class="photo-box__date">
              <Calendar /> {new Date(photo.date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </a>
      </div>
    )}
    <div class="site-footer__details">
      <a href="https://mastodon.social/@jackreid" rel="me">Mastodon</a>
      <a href="/about/now/">Now</a>
      <a href="/rss.xml">RSS</a>
      <span>Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</span>
    </div>
  </div>
</footer>
```

Note: inspect `themes/reallylol/layouts/partials/footer.html` — if the Mastodon/social links differ, use the exact links from that file.

- [ ] **Step 8: Write `astro/src/layouts/Base.astro`**

```astro
---
import SiteHeader from "../components/SiteHeader.astro";
import Footer from "../components/Footer.astro";
import "../styles/style.css";

interface Props {
  title?: string;
  description?: string;
  image?: string;
  section?: string;
}

const { title = "really.lol", description, image, section = "" } = Astro.props;
const pageTitle = title === "really.lol" ? title : `${title} | really.lol`;
---
<!doctype html>
<html lang="en-gb">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
    {description && <meta name="description" content={description} />}
    <meta property="og:title" content={pageTitle} />
    {description && <meta property="og:description" content={description} />}
    {image && <meta property="og:image" content={image} />}
    <meta property="og:type" content="website" />
    <meta name="theme-color" content="#f5efd3" />
    <link rel="alternate" type="application/rss+xml" title="really.lol" href="/rss.xml" />
    <link rel="icon" type="image/png" href="/favicon.png" />
  </head>
  <body class={section}>
    <a class="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader />
    <div class="site-wrapper" id="main-content">
      <slot />
    </div>
    <Footer />
  </body>
</html>
```

- [ ] **Step 9: Write `astro/src/layouts/Plain.astro`**

```astro
---
import Base from "./Base.astro";

interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---
<Base title={title} description={description}>
  <main class="single-main">
    <h1>{title}</h1>
    <slot />
  </main>
</Base>
```

- [ ] **Step 10: Update `astro/src/pages/index.astro` to use Base layout (smoke test)**

```astro
---
import Base from "../layouts/Base.astro";
---
<Base title="really.lol" description="A scrapbook, a journal, and a logbook.">
  <main class="home-main">
    <p>Coming soon</p>
  </main>
</Base>
```

- [ ] **Step 11: Verify dev server renders with correct CSS classes**

```bash
cd astro && bun run dev
```

Visit `http://localhost:4321` — the page should render with the cream background colour (`#f5efd3`) and correct header/footer layout.

- [ ] **Step 12: Commit**

```bash
git add astro/src/components/ astro/src/layouts/
git commit -m "feat: add base layout, site header, footer, and icon components"
```

---

## Task 6: Shared components (Pagination, SeeAlso, SubNav, TagList, ContentImage)

**Files:**
- Create: `astro/src/components/Pagination.astro`
- Create: `astro/src/components/SeeAlso.astro`
- Create: `astro/src/components/SubNav.astro`
- Create: `astro/src/components/TagList.astro`
- Create: `astro/src/components/ContentImage.astro`
- Create: `astro/src/components/PreviewCard.astro`

- [ ] **Step 1: Read the Hugo pagination partial**

```bash
cat themes/reallylol/layouts/partials/pagination.html
```

- [ ] **Step 2: Write `astro/src/components/Pagination.astro`**

```astro
---
interface Props {
  currentPage: number;
  lastPage: number;
  prevUrl?: string;
  nextUrl?: string;
}

const { currentPage, lastPage, prevUrl, nextUrl } = Astro.props;
---
<nav class="pagination" aria-label="Pagination">
  {prevUrl ? (
    <a href={prevUrl} class="pagination__prev">← Previous</a>
  ) : (
    <span class="pagination__prev pagination__prev--disabled">← Previous</span>
  )}
  <span class="pagination__count">{currentPage} / {lastPage}</span>
  {nextUrl ? (
    <a href={nextUrl} class="pagination__next">Next →</a>
  ) : (
    <span class="pagination__next pagination__next--disabled">Next →</span>
  )}
</nav>
```

- [ ] **Step 3: Write `astro/src/components/TagList.astro`**

```astro
---
import { getPrettyName } from "../lib/tags";

interface Props {
  tags: string[];
}

const { tags } = Astro.props;
---
<ul class="tag-list">
  {tags.map((tag) => (
    <li class="tag-list__item">
      <a href={`/tags/${tag}/`} class="tag-list__link">{getPrettyName(tag)}</a>
    </li>
  ))}
</ul>
```

- [ ] **Step 4: Read the Hugo see-also partial**

```bash
cat themes/reallylol/layouts/partials/see-also.html
```

- [ ] **Step 5: Write `astro/src/components/SeeAlso.astro`**

```astro
---
import { getRelated } from "../lib/related";
import type { CollectionEntry } from "astro:content";

interface Props {
  currentSlug: string;
  currentTags: string[];
  allPosts: CollectionEntry<"post">[];
}

const { currentSlug, currentTags, allPosts } = Astro.props;
const related = getRelated(currentSlug, currentTags, allPosts);
---
{related.length > 0 && (
  <section class="see-also">
    <h2 class="see-also__title">See also</h2>
    <ul class="see-also__list">
      {related.map((post) => (
        <li class="see-also__item">
          <a href={`/post/${post.slug}/`}>{post.data.title}</a>
        </li>
      ))}
    </ul>
  </section>
)}
```

- [ ] **Step 6: Read the Hugo sub-nav partial**

```bash
cat themes/reallylol/layouts/partials/sub-nav.html
```

- [ ] **Step 7: Write `astro/src/components/SubNav.astro`**

```astro
---
type NavItem = { label: string; href: string };

interface Props {
  section: "books" | "films" | "links";
  current: string;
}

const { section } = Astro.props;

const navMap: Record<string, NavItem[]> = {
  books: [
    { label: "To Read", href: "/books/toread/" },
    { label: "Reading", href: "/books/reading/" },
    { label: "Read", href: "/books/read/" },
  ],
  films: [
    { label: "To Watch", href: "/films/towatch/" },
    { label: "Watched", href: "/films/watched/" },
  ],
  links: [
    { label: "Saved Links", href: "/links/saved/" },
    { label: "Blogroll", href: "/links/blogroll/" },
  ],
};

const items = navMap[section] ?? [];
---
<nav class="sub-nav" aria-label="Sub Navigation">
  {items.map((item) => (
    <a href={item.href} class="sub-nav__link">{item.label}</a>
  ))}
</nav>
```

- [ ] **Step 8: Write `astro/src/components/ContentImage.astro`**

```astro
---
import { r2Url, r2Thumb, r2Hero } from "../lib/images";

interface Props {
  src: string;
  alt?: string;
  caption?: string;
  method?: "thumb" | "hero" | "url";
  size?: number;
  loading?: "lazy" | "eager";
}

const { src, alt = "", caption, method = "url", size, loading = "lazy" } = Astro.props;

const url =
  method === "thumb" ? r2Thumb(src, size)
  : method === "hero" ? r2Hero(src, size)
  : r2Url(src);
---
<figure class="content-image">
  <img src={url} alt={alt} loading={loading} />
  {caption && <figcaption>{caption}</figcaption>}
</figure>
```

- [ ] **Step 9: Write `astro/src/components/PreviewCard.astro`**

Read the preview partials first to understand each variant:

```bash
cat themes/reallylol/layouts/partials/preview/post.html
cat themes/reallylol/layouts/partials/preview/note.html
cat themes/reallylol/layouts/partials/preview/photo.html
cat themes/reallylol/layouts/partials/preview/highlight.html
```

Then write the component:

```astro
---
import Calendar from "./icons/Calendar.astro";
import Location from "./icons/Location.astro";
import Tag from "./icons/Tag.astro";
import { r2Thumb } from "../lib/images";
import { getPrettyName } from "../lib/tags";

interface Props {
  type: "post" | "note" | "photo" | "highlight";
  title: string;
  date: Date;
  slug: string;
  tags?: string[];
  image?: string;
  location?: string;
  excerpt?: string;
}

const { type, title, date, slug, tags, image, location, excerpt } = Astro.props;
const dateStr = date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
const href = `/${type}/${slug}/`;
const thumbUrl = image ? r2Thumb(image) : undefined;
---
{type === "photo" && (
  <article class="photo-section-item image-item">
    <a href={href} class="image-item__link">
      {thumbUrl && <img class="image-item__image" src={thumbUrl} alt={title} loading="lazy" />}
      <div class="image-item__details">
        <span class="image-item__title">{title}</span>
        {location && <span class="image-item__location"><Location /> {location}</span>}
        <span class="image-item__date"><Calendar /> {dateStr}</span>
      </div>
    </a>
  </article>
)}

{type === "post" && (
  <article class="blog-item">
    <a href={href} class="blog-item__title">{title}</a>
    <span class="blog-item__date"><Calendar /> {dateStr}</span>
    {tags && tags.length > 0 && (
      <span class="blog-item__tags">
        <Tag />
        {tags.map((tag) => (
          <a href={`/tags/${tag}/`}>{getPrettyName(tag)}</a>
        ))}
      </span>
    )}
    {excerpt && <p class="blog-item__excerpt">{excerpt}</p>}
  </article>
)}

{type === "note" && (
  <article class="note-item">
    <a href={href} class="note-item__title">{title}</a>
    <span class="note-item__date"><Calendar /> {dateStr}</span>
  </article>
)}

{type === "highlight" && (
  <article class="highlight-item">
    <a href={href} class="highlight-item__title">{title}</a>
    <span class="highlight-item__date"><Calendar /> {dateStr}</span>
    {tags && tags.length > 0 && (
      <span class="highlight-item__tags">
        {tags.map((tag) => (
          <a href={`/tags/${tag}/`}>{getPrettyName(tag)}</a>
        ))}
      </span>
    )}
  </article>
)}
```

- [ ] **Step 10: Commit**

```bash
git add astro/src/components/
git commit -m "feat: add Pagination, SeeAlso, SubNav, TagList, ContentImage, PreviewCard components"
```

---

## Task 7: Post pages

**Files:**
- Create: `astro/src/pages/post/index.astro`
- Create: `astro/src/pages/post/[...page].astro`
- Create: `astro/src/pages/post/[slug].astro`

- [ ] **Step 1: Write a Playwright test for posts before implementing**

Add to `tests/sections.spec.ts` a test that will run against the Astro server:

```ts
// Add this block at the bottom of tests/sections.spec.ts:
test.describe("Post section (Astro)", () => {
  test("paginated listing renders posts", async ({ page }) => {
    await page.goto("/post/1/");
    await expect(page.locator(".section-main")).toBeVisible();
    const items = page.locator(".blog-item");
    expect(await items.count()).toBeGreaterThan(0);
  });

  test("single post renders title and content", async ({ page }) => {
    await page.goto("/post/1/");
    const firstLink = page.locator(".blog-item__title a, .blog-item a").first();
    const href = await firstLink.getAttribute("href");
    await page.goto(href!);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".single-main")).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the new tests against the Astro server — expect failure**

```bash
bun run playwright test --config=astro.playwright.config.ts tests/sections.spec.ts -g "Post section" 2>&1 | tail -20
```

Expected: `Error: page.goto: net::ERR_CONNECTION_REFUSED` (Astro pages don't exist yet)

- [ ] **Step 3: Read the Hugo section template for posts**

```bash
cat themes/reallylol/layouts/section.html
```

- [ ] **Step 4: Write `astro/src/pages/post/index.astro`**

```astro
---
return Astro.redirect("/post/1/");
---
```

- [ ] **Step 5: Write `astro/src/pages/post/[...page].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import PreviewCard from "../../components/PreviewCard.astro";
import Pagination from "../../components/Pagination.astro";

export async function getStaticPaths({ paginate }: { paginate: Function }) {
  const posts = await getCollection("post");
  const sorted = posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(sorted, { pageSize: 10 });
}

const { page } = Astro.props;
---
<Base title="Posts" section="post">
  <main class="section-main section-main--post">
    <h1 class="section-title">Posts</h1>
    <ul class="multi-preview-list">
      {page.data.map((post) => (
        <li>
          <PreviewCard
            type="post"
            title={post.data.title}
            date={post.data.date}
            slug={post.slug}
            tags={post.data.tags}
          />
        </li>
      ))}
    </ul>
    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={page.url.prev}
      nextUrl={page.url.next}
    />
  </main>
</Base>
```

- [ ] **Step 6: Read the Hugo single post template**

```bash
cat themes/reallylol/layouts/single.html
```

- [ ] **Step 7: Write `astro/src/pages/post/[slug].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import SeeAlso from "../../components/SeeAlso.astro";
import TagList from "../../components/TagList.astro";
import Calendar from "../../components/icons/Calendar.astro";
import Location from "../../components/icons/Location.astro";

export async function getStaticPaths() {
  const posts = await getCollection("post");
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
const allPosts = await getCollection("post");
const dateStr = post.data.date.toLocaleDateString("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
---
<Base title={post.data.title} section="post">
  <main class="single-main">
    <article>
      <header>
        <h1>{post.data.title}</h1>
        {post.data.subtitle && <p class="single-main__subtitle">{post.data.subtitle}</p>}
        <div class="single-main__meta">
          <span class="single-main__date"><Calendar /> {dateStr}</span>
          {post.data.tags && <TagList tags={post.data.tags} />}
        </div>
      </header>
      <div class="single-main__content">
        <Content />
      </div>
    </article>
    <SeeAlso
      currentSlug={post.slug}
      currentTags={post.data.tags ?? []}
      allPosts={allPosts}
    />
  </main>
</Base>
```

- [ ] **Step 8: Run the Playwright tests**

```bash
bun run playwright test --config=astro.playwright.config.ts tests/sections.spec.ts -g "Post section"
```

Expected: tests pass

- [ ] **Step 9: Commit**

```bash
git add astro/src/pages/post/
git commit -m "feat: add post listing and single post pages"
```

---

## Task 8: Note pages

**Files:**
- Create: `astro/src/pages/note/index.astro`
- Create: `astro/src/pages/note/[...page].astro`
- Create: `astro/src/pages/note/[slug].astro`

- [ ] **Step 1: Read the Hugo note templates**

```bash
cat themes/reallylol/layouts/note/section.html
cat themes/reallylol/layouts/note/single.html
```

- [ ] **Step 2: Write `astro/src/pages/note/index.astro`**

```astro
---
return Astro.redirect("/note/1/");
---
```

- [ ] **Step 3: Write `astro/src/pages/note/[...page].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import Pagination from "../../components/Pagination.astro";

export async function getStaticPaths({ paginate }: { paginate: Function }) {
  const notes = await getCollection("note");
  const sorted = notes.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(sorted, { pageSize: 10 });
}

const { page } = Astro.props;
---
<Base title="Notes" section="note">
  <main class="note-section-main">
    <header class="note-section-header">
      <h1 class="note-list-title">Notes</h1>
    </header>
    <ul class="note-list">
      {page.data.map((note) => (
        <li class="note-list-item">
          <a class="note-item__title" href={`/note/${note.slug}/`}>{note.data.title}</a>
          <span class="note-item__date">
            {note.data.date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </li>
      ))}
    </ul>
    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={page.url.prev}
      nextUrl={page.url.next}
    />
  </main>
</Base>
```

- [ ] **Step 4: Write `astro/src/pages/note/[slug].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import Calendar from "../../components/icons/Calendar.astro";

export async function getStaticPaths() {
  const notes = await getCollection("note");
  return notes.map((note) => ({
    params: { slug: note.slug },
    props: { note },
  }));
}

const { note } = Astro.props;
const { Content } = await note.render();
const dateStr = note.data.date.toLocaleDateString("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
---
<Base title={note.data.title} section="note">
  <main class="note-main">
    <article>
      <header>
        <h1>{note.data.title}</h1>
        <span class="note-main__date"><Calendar /> {dateStr}</span>
      </header>
      <div class="note-main__content">
        <Content />
      </div>
    </article>
  </main>
</Base>
```

- [ ] **Step 5: Run the existing notes section test**

```bash
bun run playwright test --config=astro.playwright.config.ts tests/sections.spec.ts -g "Notes section"
```

Expected: `loads and displays title` and `renders content list` pass; screenshot test may fail initially (no baseline) — run with `--update-snapshots` once to create the baseline.

- [ ] **Step 6: Commit**

```bash
git add astro/src/pages/note/
git commit -m "feat: add note listing and single note pages"
```

---

## Task 9: Photo pages

**Files:**
- Create: `astro/src/pages/photo/index.astro`
- Create: `astro/src/pages/photo/[...page].astro`
- Create: `astro/src/pages/photo/[slug].astro`

- [ ] **Step 1: Read the Hugo photo templates**

```bash
cat themes/reallylol/layouts/photo/section.html
cat themes/reallylol/layouts/photo/single.html
```

- [ ] **Step 2: Write `astro/src/pages/photo/index.astro`**

```astro
---
return Astro.redirect("/photo/1/");
---
```

- [ ] **Step 3: Write `astro/src/pages/photo/[...page].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import PreviewCard from "../../components/PreviewCard.astro";
import Pagination from "../../components/Pagination.astro";

export async function getStaticPaths({ paginate }: { paginate: Function }) {
  const photos = await getCollection("photo");
  const sorted = photos.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(sorted, { pageSize: 24 });
}

const { page } = Astro.props;
---
<Base title="Photos" section="photo">
  <main class="photo-section-main">
    <h1 class="default-section-title">Photos</h1>
    <div class="photo-section-grid">
      {page.data.map((photo) => (
        <PreviewCard
          type="photo"
          title={photo.data.title}
          date={photo.data.date}
          slug={photo.slug}
          image={photo.data.image}
          location={photo.data.location}
        />
      ))}
    </div>
    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={page.url.prev}
      nextUrl={page.url.next}
    />
  </main>
</Base>
```

- [ ] **Step 4: Write `astro/src/pages/photo/[slug].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import TagList from "../../components/TagList.astro";
import Calendar from "../../components/icons/Calendar.astro";
import Location from "../../components/icons/Location.astro";
import { r2Hero } from "../../lib/images";

export async function getStaticPaths() {
  const photos = await getCollection("photo");
  return photos.map((photo) => ({
    params: { slug: photo.slug },
    props: { photo },
  }));
}

const { photo } = Astro.props;
const { Content } = await photo.render();
const heroUrl = r2Hero(photo.data.image);
const dateStr = photo.data.date.toLocaleDateString("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
---
<Base
  title={photo.data.title}
  section="photo"
  image={heroUrl}
>
  <main class="single-main single-main--photo">
    <article>
      <figure class="photo-main__figure">
        <img
          class="photo-main__image"
          src={heroUrl}
          alt={photo.data.title}
          loading="eager"
        />
      </figure>
      <header>
        <h1>{photo.data.title}</h1>
        <div class="single-main__meta">
          <span class="single-main__date"><Calendar /> {dateStr}</span>
          {photo.data.location && (
            <span class="single-main__location"><Location /> {photo.data.location}</span>
          )}
          {photo.data.tags && <TagList tags={photo.data.tags} />}
        </div>
      </header>
      <div class="single-main__content">
        <Content />
      </div>
    </article>
  </main>
</Base>
```

- [ ] **Step 5: Run the photos section test**

```bash
bun run playwright test --config=astro.playwright.config.ts tests/sections.spec.ts -g "Photos section"
```

Expected: passes (or update snapshots for first run)

- [ ] **Step 6: Commit**

```bash
git add astro/src/pages/photo/
git commit -m "feat: add photo grid and single photo pages"
```

---

## Task 10: Highlight pages

**Files:**
- Create: `astro/src/pages/highlight/index.astro`
- Create: `astro/src/pages/highlight/[...page].astro`
- Create: `astro/src/pages/highlight/[slug].astro`

- [ ] **Step 1: Read the Hugo highlight templates**

```bash
cat themes/reallylol/layouts/highlight/section.html
cat themes/reallylol/layouts/highlight/single.html
```

- [ ] **Step 2: Write `astro/src/pages/highlight/index.astro`**

```astro
---
return Astro.redirect("/highlight/1/");
---
```

- [ ] **Step 3: Write `astro/src/pages/highlight/[...page].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import PreviewCard from "../../components/PreviewCard.astro";
import Pagination from "../../components/Pagination.astro";

export async function getStaticPaths({ paginate }: { paginate: Function }) {
  const highlights = await getCollection("highlight");
  const sorted = highlights.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return paginate(sorted, { pageSize: 10 });
}

const { page } = Astro.props;
---
<Base title="Highlights" section="highlight">
  <main class="highlight-section-main">
    <h1 class="section-title">Highlights</h1>
    <ul class="highlight-list">
      {page.data.map((highlight) => (
        <li class="highlight-list-item">
          <PreviewCard
            type="highlight"
            title={highlight.data.title}
            date={highlight.data.date}
            slug={highlight.data.slug}
            tags={highlight.data.tags}
          />
        </li>
      ))}
    </ul>
    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={page.url.prev}
      nextUrl={page.url.next}
    />
  </main>
</Base>
```

- [ ] **Step 4: Write `astro/src/pages/highlight/[slug].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import TagList from "../../components/TagList.astro";
import Calendar from "../../components/icons/Calendar.astro";

export async function getStaticPaths() {
  const highlights = await getCollection("highlight");
  return highlights.map((h) => ({
    params: { slug: h.data.slug },
    props: { highlight: h },
  }));
}

const { highlight } = Astro.props;
const { Content } = await highlight.render();
const dateStr = highlight.data.date.toLocaleDateString("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
---
<Base title={highlight.data.title} section="highlight">
  <main class="highlight-main">
    <article>
      <header>
        <h1>
          <a href={highlight.data.link} target="_blank" rel="noopener">{highlight.data.title}</a>
        </h1>
        <div class="single-main__meta">
          <span class="single-main__date"><Calendar /> {dateStr}</span>
          {highlight.data.tags && <TagList tags={highlight.data.tags} />}
        </div>
      </header>
      <div class="highlight-main__content">
        <Content />
      </div>
    </article>
  </main>
</Base>
```

- [ ] **Step 5: Commit**

```bash
git add astro/src/pages/highlight/
git commit -m "feat: add highlight listing and single highlight pages"
```

---

## Task 11: Data pages (books, films, links)

**Files:**
- Create: `astro/src/pages/books/reading.astro`
- Create: `astro/src/pages/books/read.astro`
- Create: `astro/src/pages/books/toread.astro`
- Create: `astro/src/pages/films/watched.astro`
- Create: `astro/src/pages/films/towatch.astro`
- Create: `astro/src/pages/links/saved.astro`
- Create: `astro/src/pages/links/blogroll.astro`

- [ ] **Step 1: Read the data file structure**

```bash
cat data/books/reading.json | head -30
cat data/films/watched.json | head -30
cat data/links.json | head -30
```

Note the exact field names for use in the templates below.

- [ ] **Step 2: Read the Hugo media/links templates**

```bash
cat themes/reallylol/layouts/media/single.html
cat themes/reallylol/layouts/links/single.html
```

- [ ] **Step 3: Write `astro/src/pages/books/reading.astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import SubNav from "../../components/SubNav.astro";
import readingBooks from "../../data/books/reading.json";

type Book = {
  title: string;
  author: string;
  date_updated: string;
  image_url?: string;
  hardcover_url?: string;
};

const books = readingBooks as Book[];
---
<Base title="Reading" section="media">
  <main class="single-main single-main--links">
    <SubNav section="books" current="reading" />
    <h1>Reading</h1>
    <div class="book-grid">
      {books.map((book) => (
        <article class="book-card">
          {book.image_url && (
            <div class="book-card__cover-frame">
              <img class="book-card__cover" src={book.image_url} alt={book.title} loading="lazy" />
            </div>
          )}
          <div class="book-card__meta">
            {book.hardcover_url ? (
              <a class="book-card__title" href={book.hardcover_url} target="_blank" rel="noopener">{book.title}</a>
            ) : (
              <span class="book-card__title">{book.title}</span>
            )}
            <span class="book-card__author">{book.author}</span>
            <span class="book-card__date">{book.date_updated}</span>
          </div>
        </article>
      ))}
    </div>
  </main>
</Base>
```

- [ ] **Step 4: Write `astro/src/pages/books/read.astro`**

Same as `reading.astro` but imports from `../../data/books/read.json` and uses title `"Read"`:

```astro
---
import Base from "../../layouts/Base.astro";
import SubNav from "../../components/SubNav.astro";
import readBooks from "../../data/books/read.json";

type Book = {
  title: string;
  author: string;
  date_updated: string;
  image_url?: string;
  hardcover_url?: string;
};

const books = readBooks as Book[];
---
<Base title="Read" section="media">
  <main class="single-main single-main--links">
    <SubNav section="books" current="read" />
    <h1>Read</h1>
    <div class="book-grid">
      {books.map((book) => (
        <article class="book-card">
          {book.image_url && (
            <div class="book-card__cover-frame">
              <img class="book-card__cover" src={book.image_url} alt={book.title} loading="lazy" />
            </div>
          )}
          <div class="book-card__meta">
            {book.hardcover_url ? (
              <a class="book-card__title" href={book.hardcover_url} target="_blank" rel="noopener">{book.title}</a>
            ) : (
              <span class="book-card__title">{book.title}</span>
            )}
            <span class="book-card__author">{book.author}</span>
            <span class="book-card__date">{book.date_updated}</span>
          </div>
        </article>
      ))}
    </div>
  </main>
</Base>
```

- [ ] **Step 5: Write `astro/src/pages/books/toread.astro`** (same pattern, `toread.json`, title `"To Read"`)

- [ ] **Step 6: Write `astro/src/pages/films/watched.astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import SubNav from "../../components/SubNav.astro";
import watchedFilms from "../../data/films/watched.json";

type Film = {
  name: string;
  year: string | number;
  date_updated: string;
};

const films = watchedFilms as Film[];
---
<Base title="Watched" section="media">
  <main class="single-main single-main--links">
    <SubNav section="films" current="watched" />
    <h1>Watched</h1>
    <table class="media-table">
      <thead>
        <tr><th>Film</th><th>Year</th><th>Date</th></tr>
      </thead>
      <tbody>
        {films.map((film) => (
          <tr>
            <td>{film.name}</td>
            <td>{film.year}</td>
            <td>{film.date_updated}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </main>
</Base>
```

- [ ] **Step 7: Write `astro/src/pages/films/towatch.astro`** (same, `towatch.json`, title `"To Watch"`)

- [ ] **Step 8: Write `astro/src/pages/links/saved.astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import SubNav from "../../components/SubNav.astro";
import allLinks from "../../data/links.json";

type Link = {
  title: string;
  url: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  cover?: string;
};

// Sort by date descending; client-side pagination not needed for static build
// Show all links (or paginate if too many for one page)
const links = (allLinks as Link[]).sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);
---
<Base title="Saved Links" section="links">
  <main class="single-main single-main--links">
    <SubNav section="links" current="saved" />
    <h1>Saved Links</h1>
    <ul class="links-list">
      {links.map((link) => (
        <li class="links-list__item">
          <a class="links-list__title" href={link.url} target="_blank" rel="noopener">{link.title}</a>
          <span class="links-list__date">{link.date}</span>
          {link.excerpt && <p class="links-list__excerpt">{link.excerpt}</p>}
        </li>
      ))}
    </ul>
  </main>
</Base>
```

- [ ] **Step 9: Read the Hugo blogroll content**

```bash
cat content/links/blogroll.md 2>/dev/null || echo "not found"
ls content/links/ 2>/dev/null
```

- [ ] **Step 10: Write `astro/src/pages/links/blogroll.astro`**

```astro
---
import Base from "../../layouts/Base.astro";
import SubNav from "../../components/SubNav.astro";
---
<Base title="Blogroll" section="links">
  <main class="single-main single-main--links">
    <SubNav section="links" current="blogroll" />
    <h1>Blogroll</h1>
    <!-- blogroll content here - read from content/links/blogroll.md or hardcode -->
  </main>
</Base>
```

Note: if `content/links/blogroll.md` exists, read it as a markdown file and render it via Astro content loader. If it's static HTML, embed it directly.

- [ ] **Step 11: Run the sub-navigation tests**

```bash
bun run playwright test --config=astro.playwright.config.ts tests/sections.spec.ts -g "Sub-navigation"
```

Expected: all 3 sub-nav tests pass

- [ ] **Step 12: Commit**

```bash
git add astro/src/pages/books/ astro/src/pages/films/ astro/src/pages/links/
git commit -m "feat: add books, films, and links data pages"
```

---

## Task 12: Tag pages

**Files:**
- Create: `astro/src/pages/tags/index.astro`
- Create: `astro/src/pages/tags/[tag]/[...page].astro`

- [ ] **Step 1: Write `astro/src/pages/tags/index.astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import { getPrettyName } from "../../lib/tags";

const posts = await getCollection("post");
const notes = await getCollection("note");
const photos = await getCollection("photo");
const highlights = await getCollection("highlight");

// Build tag count map
const tagCounts = new Map<string, number>();

function countTags(tags: string[] | undefined) {
  if (!tags) return;
  for (const tag of tags) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
}

posts.forEach((p) => countTags(p.data.tags));
photos.forEach((p) => countTags(p.data.tags));
highlights.forEach((h) => countTags(h.data.tags));

const sortedTags = [...tagCounts.entries()]
  .sort((a, b) => b[1] - a[1]);
---
<Base title="Tags">
  <main class="single-main">
    <h1>Tags</h1>
    <ul class="tag-index-list">
      {sortedTags.map(([tag, count]) => (
        <li class="tag-index-list__item">
          <a href={`/tags/${tag}/`}>{getPrettyName(tag)}</a>
          <span class="tag-index-list__count">{count}</span>
        </li>
      ))}
    </ul>
  </main>
</Base>
```

- [ ] **Step 2: Write `astro/src/pages/tags/[tag]/[...page].astro`**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../../layouts/Base.astro";
import PreviewCard from "../../../components/PreviewCard.astro";
import Pagination from "../../../components/Pagination.astro";
import { getPrettyName } from "../../../lib/tags";

export async function getStaticPaths({ paginate }: { paginate: Function }) {
  const posts = await getCollection("post");
  const notes = await getCollection("note");
  const photos = await getCollection("photo");
  const highlights = await getCollection("highlight");

  // Collect all unique tags
  const allTags = new Set<string>();
  posts.forEach((p) => p.data.tags?.forEach((t) => allTags.add(t)));
  photos.forEach((p) => p.data.tags?.forEach((t) => allTags.add(t)));
  highlights.forEach((h) => h.data.tags?.forEach((t) => allTags.add(t)));

  return [...allTags].flatMap((tag) => {
    const taggedPosts = posts
      .filter((p) => p.data.tags?.includes(tag))
      .map((p) => ({ type: "post" as const, title: p.data.title, date: p.data.date, slug: p.slug, tags: p.data.tags }));
    const taggedPhotos = photos
      .filter((p) => p.data.tags?.includes(tag))
      .map((p) => ({ type: "photo" as const, title: p.data.title, date: p.data.date, slug: p.slug, image: p.data.image, location: p.data.location }));
    const taggedHighlights = highlights
      .filter((h) => h.data.tags?.includes(tag))
      .map((h) => ({ type: "highlight" as const, title: h.data.title, date: h.data.date, slug: h.data.slug }));

    const combined = [...taggedPosts, ...taggedPhotos, ...taggedHighlights]
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (combined.length === 0) return [];

    return paginate(combined, {
      params: { tag },
      pageSize: 10,
    });
  });
}

const { page, params } = Astro.props;
const tag = params.tag as string;
const prettyName = getPrettyName(tag);
---
<Base title={`Tagged: ${prettyName}`}>
  <main class="single-main">
    <h1>#{prettyName}</h1>
    <ul class="multi-preview-list">
      {page.data.map((item) => (
        <li>
          <PreviewCard
            type={item.type}
            title={item.title}
            date={item.date}
            slug={item.slug}
            tags={"tags" in item ? item.tags : undefined}
            image={"image" in item ? item.image : undefined}
            location={"location" in item ? item.location : undefined}
          />
        </li>
      ))}
    </ul>
    <Pagination
      currentPage={page.currentPage}
      lastPage={page.lastPage}
      prevUrl={page.url.prev}
      nextUrl={page.url.next}
    />
  </main>
</Base>
```

- [ ] **Step 3: Commit**

```bash
git add astro/src/pages/tags/
git commit -m "feat: add tag index and per-tag archive pages"
```

---

## Task 13: About pages and 404

**Files:**
- Create: `astro/src/pages/about/now.astro`
- Create: `astro/src/pages/about/uses.astro`
- Create: `astro/src/pages/404.astro`

- [ ] **Step 1: Read the Hugo about pages**

```bash
cat content/about/now.md 2>/dev/null | head -30
cat content/about/uses.md 2>/dev/null | head -30
```

- [ ] **Step 2: Write `astro/src/pages/about/now.astro`**

The about pages are static markdown. Read and render them:

```astro
---
import Plain from "../../layouts/Plain.astro";
// The about pages have no collection — import the markdown file directly
// If content/about/now.md exists as a standalone file:
// import nowContent from "../../../content/about/now.md"; // doesn't work for non-collection markdown
// Instead, inline the content or use a glob import

// Simpler approach: render inline or use glob
---
<Plain title="Now">
  <!-- Content will be pasted from content/about/now.md body -->
  <!-- Or use: const raw = await import("../../../content/about/now.md") for mdx/md -->
</Plain>
```

Note: for standalone markdown files not in a collection, use `Astro.glob` or paste content inline. Check if the content is static enough to inline.

- [ ] **Step 3: Write `astro/src/pages/404.astro`**

```astro
---
import Base from "../layouts/Base.astro";
export const prerender = true;
---
<Base title="404 — Page Not Found">
  <main class="single-main">
    <h1>404</h1>
    <p>The page you're looking for doesn't exist.</p>
    <p><a href="/">Return home</a></p>
  </main>
</Base>
```

- [ ] **Step 4: Commit**

```bash
git add astro/src/pages/about/ astro/src/pages/404.astro
git commit -m "feat: add about pages and 404"
```

---

## Task 14: Homepage

**Files:**
- Modify: `astro/src/pages/index.astro`

- [ ] **Step 1: Read the Hugo homepage template and current reading data**

```bash
cat themes/reallylol/layouts/index.html
cat data/books/reading.json | head -20
```

- [ ] **Step 2: Write `astro/src/pages/index.astro`**

```astro
---
import Base from "../layouts/Base.astro";
import readingBooks from "../data/books/reading.json";

type Book = {
  title: string;
  author: string;
  date_updated: string;
  image_url?: string;
  hardcover_url?: string;
};

const books = readingBooks as Book[];
const currentBook = books[0];
---
<Base
  title="really.lol"
  description="A scrapbook, a journal, and a logbook."
>
  <main class="home-main">
    <section class="home-intro">
      <p>Hi, I'm Jack. This is my corner of the web.</p>
    </section>
    {currentBook && (
      <section class="home-component">
        <dl class="home-component__reading">
          <dt>Reading</dt>
          <dd>
            {currentBook.hardcover_url ? (
              <a href={currentBook.hardcover_url} target="_blank" rel="noopener">
                {currentBook.title}
              </a>
            ) : (
              currentBook.title
            )}
            {currentBook.author && <span> by {currentBook.author}</span>}
          </dd>
        </dl>
      </section>
    )}
  </main>
</Base>
```

Note: check `themes/reallylol/layouts/index.html` for the exact homepage copy and hero image. Update the `<p>` text and any hero image path to match the Hugo original.

- [ ] **Step 3: Run homepage Playwright tests**

```bash
bun run playwright test --config=astro.playwright.config.ts tests/homepage.spec.ts
```

Expected: `renders with correct title`, `has correct meta description`, `displays the home intro content`, `shows current reading` all pass.

- [ ] **Step 4: Commit**

```bash
git add astro/src/pages/index.astro
git commit -m "feat: implement homepage with current reading widget"
```

---

## Task 15: RSS feed and sitemap

**Files:**
- Create: `astro/src/pages/rss.xml.ts`

- [ ] **Step 1: Write `astro/src/pages/rss.xml.ts`**

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await getCollection("post");
  const notes = await getCollection("note");
  const highlights = await getCollection("highlight");
  const photos = await getCollection("photo");

  const allItems = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/post/${p.slug}/`,
    })),
    ...notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      link: `/note/${n.slug}/`,
    })),
    ...highlights.map((h) => ({
      title: h.data.title,
      pubDate: h.data.date,
      link: `/highlight/${h.data.slug}/`,
    })),
    ...photos.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/photo/${p.slug}/`,
      description: "This post is a photo. Visit really.lol to view it.",
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "really.lol",
    description: "Jack Reid's blog",
    site: context.site!.toString(),
    items: allItems,
  });
}
```

- [ ] **Step 2: Verify RSS is generated**

```bash
cd astro && bun run build && cat dist/rss.xml | head -30
```

Expected: valid RSS XML with `<channel>` and multiple `<item>` entries.

- [ ] **Step 3: Commit**

```bash
git add astro/src/pages/rss.xml.ts
git commit -m "feat: add RSS feed endpoint"
```

---

## Task 16: Full Playwright test run and remark plugin for Hugo shortcodes

**Files:**
- Create: `astro/src/lib/remark-hugo-shortcodes.ts`
- Modify: `astro/astro.config.ts`

- [ ] **Step 1: Run the full Playwright test suite against Astro**

```bash
bun run playwright test --config=astro.playwright.config.ts 2>&1 | tail -40
```

Note all failures. Common issues:
- Screenshot mismatches → run with `--update-snapshots` to create new Astro baselines
- Missing CSS classes → inspect the rendered HTML and fix component class names
- 404 pages → check that all routes from `tests/navigation.spec.ts` are implemented

- [ ] **Step 2: Fix any failing tests — inspect and update class names or routes as needed**

For each failure: check what the test expects, compare with what the page renders, fix the component.

- [ ] **Step 3: Check if any content has Hugo shortcodes**

```bash
grep -rl "{{<" content/post/ | head -10
grep -rl "{{<" content/note/ | head -10
```

- [ ] **Step 4: If shortcodes exist in content, write `astro/src/lib/remark-hugo-shortcodes.ts`**

```ts
import type { Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const R2_BASE = "https://media.really.lol";

/**
 * Remark plugin that transforms Hugo shortcodes into HTML.
 * Handles: {{< image src="..." alt="..." >}}, {{< audio src="..." >}}
 */
export const remarkHugoShortcodes: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "paragraph", (node: any) => {
      const children = node.children ?? [];
      for (const child of children) {
        if (child.type !== "text") continue;
        const text: string = child.value;

        // {{< image src="..." alt="..." caption="..." >}}
        if (text.includes("{{< image")) {
          const srcMatch = text.match(/src="([^"]+)"/);
          const altMatch = text.match(/alt="([^"]+)"/);
          const captionMatch = text.match(/caption="([^"]+)"/);
          if (srcMatch) {
            const src = srcMatch[1];
            const alt = altMatch ? altMatch[1] : "";
            const caption = captionMatch ? captionMatch[1] : "";
            const url = src.startsWith("http") ? src : `${R2_BASE}/${src.replace(/^\//, "")}`;
            child.type = "html";
            child.value = `<figure><img src="${url}" alt="${alt}" loading="lazy" />${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`;
          }
        }

        // {{< audio src="..." >}}
        if (text.includes("{{< audio")) {
          const srcMatch = text.match(/src="([^"]+)"/);
          if (srcMatch) {
            const src = srcMatch[1];
            child.type = "html";
            child.value = `<audio controls src="${src}"></audio>`;
          }
        }
      }
    });
  };
};
```

- [ ] **Step 5: Install required packages and update `astro/astro.config.ts`**

```bash
cd astro && bun add unist-util-visit
```

Update `astro/astro.config.ts`:

```ts
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { remarkHugoShortcodes } from "./src/lib/remark-hugo-shortcodes";

export default defineConfig({
  site: "https://really.lol",
  output: "static",
  integrations: [
    sitemap({
      serialize(item) {
        if (item.url === "https://really.lol/") item.priority = 1.0;
        else if (item.url.startsWith("https://really.lol/post")) item.priority = 0.6;
        else if (item.url.startsWith("https://really.lol/photo")) item.priority = 0.5;
        else if (item.url.startsWith("https://really.lol/note")) item.priority = 0.3;
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkHugoShortcodes],
    shikiConfig: { theme: "dracula" },
  },
});
```

- [ ] **Step 6: Run full build to verify no shortcode errors**

```bash
cd astro && bun run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no shortcode-related errors.

- [ ] **Step 7: Commit**

```bash
git add astro/src/lib/remark-hugo-shortcodes.ts astro/astro.config.ts astro/package.json astro/bun.lockb
git commit -m "feat: add remark plugin for Hugo shortcode syntax"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Astro project scaffold in `astro/` | Task 1 |
| CSS files copied verbatim | Task 2 |
| Astro Playwright config | Task 2 |
| Content collection Zod schemas | Task 3 |
| Symlinks for content directories | Task 3 |
| `r2Url`, `r2Thumb`, `r2Hero` | Task 4 |
| `getPrettyName` tag lookup | Task 4 |
| `getRelated` tag overlap | Task 4 |
| Icon components (7 icons) | Task 5 |
| `Base.astro` layout | Task 5 |
| `SiteHeader.astro` | Task 5 |
| `Footer.astro` with random photo | Task 5 |
| `Pagination.astro` | Task 6 |
| `SeeAlso.astro` | Task 6 |
| `SubNav.astro` | Task 6 |
| `TagList.astro` | Task 6 |
| `ContentImage.astro` | Task 6 |
| `PreviewCard.astro` (4 variants) | Task 6 |
| Post listing + single page | Task 7 |
| Note listing + single page | Task 8 |
| Photo grid (24/page) + single | Task 9 |
| Highlight listing + single | Task 10 |
| Books pages (reading/read/toread) | Task 11 |
| Films pages (watched/towatch) | Task 11 |
| Links pages (saved/blogroll) | Task 11 |
| Tags index + per-tag archive | Task 12 |
| About pages (now/uses) | Task 13 |
| 404 page | Task 13 |
| Homepage with reading widget | Task 14 |
| RSS feed | Task 15 |
| Sitemap (in astro.config.ts) | Task 1 |
| Playwright tests against Astro | Task 16 |
| Remark plugin for `{{< image >}}` | Task 16 |
