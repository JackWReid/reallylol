# really.lol: Hugo to Astro Migration Spec

## Context

really.lol is a personal blog currently built with Hugo, deployed on Cloudflare Pages. The repo is bloated (728MB git, 555MB images) because 2643 photo posts have their images committed to `assets/img/photo/`. The site is migrating to a headless CMS (Payload, Directus, or EmDash -- TBD) with an Astro frontend. This spec covers the Astro rendering layer, designed CMS-agnostic, with images on Cloudflare R2 from day one.

---

## Current Site Inventory

| Type | Count | Key fields |
|------|-------|-----------|
| photo | 2643 | title, date, image, location, tags, instagram |
| highlight | 150 | title, date, slug, link, tags |
| post | 148 | title, date, tags, slug, subtitle; some have book_author, movie_released, media_image, rating |
| note | 110 | title, date |
| data: books | 3 JSON files | title, author, date_updated, image_url, hardcover_url |
| data: films | 2 JSON files | name, year, date_updated |
| data: links | 1 JSON file | title, url, date, excerpt, tags, cover |
| static pages | ~5 | about/now, about/uses, links/blogroll, links/saved, homepage |

---

## Astro Project Structure

```
astro/
  astro.config.ts
  package.json
  tsconfig.json
  src/
    content/
      config.ts              # Content collection schemas (Zod)
      post/                   # Symlink or copy from ../content/post/
      note/                   # Symlink or copy from ../content/note/
      photo/                  # Symlink or copy from ../content/photo/
      highlight/              # Symlink or copy from ../content/highlight/
    data/                     # Symlink or copy from ../data/
      books/
      films/
      links.json
      random_photos.json
      content_config.json
    layouts/
      Base.astro              # <html>, <head>, skip link, header, footer
      Plain.astro             # Simple page (title + content)
    components/
      SiteHeader.astro
      Footer.astro            # Random photo widget, social links
      Pagination.astro        # Server-rendered pagination
      SeeAlso.astro           # Related posts by tags
      SubNav.astro            # Books/films/links sub-navigation
      TagList.astro           # Tag links with pretty-name mapping
      PhotoGrid.astro         # 3-column thumbnail grid
      BookGrid.astro          # Book card grid
      FilmTable.astro         # Film table
      LinksList.astro         # Saved links list
      ContentImage.astro      # Replaces Hugo {{< image >}} shortcode
      PreviewCard.astro       # Content preview (post/note/highlight/photo variants)
      icons/                  # SVG icon components (calendar, location, etc.)
    pages/
      index.astro             # Homepage
      post/
        index.astro           # Post section listing
        [...page].astro       # Paginated post listing
        [slug].astro          # Single post
      note/
        index.astro
        [...page].astro
        [slug].astro
      photo/
        index.astro
        [...page].astro       # Paginated grid, 24 per page
        [slug].astro          # Single photo
      highlight/
        index.astro
        [...page].astro
        [slug].astro
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
        index.astro           # All tags
        [tag]/
          [...page].astro     # Paginated tag archive
      about/
        now.astro
        uses.astro
      404.astro
      rss.xml.ts              # RSS feed endpoint
    styles/
      style.css               # Import file (reuse existing CSS)
      _variables.css          # Copied from Hugo theme as-is
      _reset.css
      _base.css
      _layout.css
      _components.css
      _specials.css
      _utilities.css
    lib/
      images.ts               # R2 URL builder + image transform helpers
      tags.ts                 # Tag pretty-name mapping from content_config
      related.ts              # "See Also" related content by tags
      pagination.ts           # Shared pagination helpers
  public/
    # Static assets only (no images -- they're on R2)
```

---

## Content Collections (`src/content/config.ts`)

Astro content collections with Zod schemas formalise the currently loose Hugo frontmatter.

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
    // Media log fields (posts that are book/film reviews)
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
    image: z.string(),         // Path like "img/photo/2024-01-01-slug.jpg"
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

**Phase 1 (markdown content collections):** Content lives in the repo as markdown, Astro reads it via content collections. This is the starting state.

**Phase 2 (CMS):** Replace content collections with API calls to the CMS (Payload/Directus/EmDash). The page templates stay identical -- only the data-fetching layer changes. Content collection schemas become the reference for CMS content type definitions.

---

## Image Strategy: R2 from Day One

### Architecture

```
[Markdown frontmatter]          [Astro component]              [Browser]
image: "img/photo/foo.jpg"  -->  r2Url("img/photo/foo.jpg")  -->  <img src="https://media.really.lol/img/photo/foo.jpg">
```

**R2 bucket:** `really-lol-media` (or similar), publicly accessible via custom domain `media.really.lol` (Cloudflare R2 custom domains, no egress fees).

### `src/lib/images.ts`

```ts
const R2_BASE = import.meta.env.PUBLIC_R2_BASE ?? "https://media.really.lol";

/** Resolve a content-relative image path to a full R2 URL. */
export function r2Url(path: string): string {
  const clean = path.replace(/^\//, "");
  return `${R2_BASE}/${clean}`;
}

/**
 * Generate a thumbnail URL using Cloudflare Image Resizing.
 * Used for photo grid thumbnails (500x500 cover crop).
 */
export function r2Thumb(path: string, size = 500): string {
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=cover/${path.replace(/^\//, "")}`;
}

/**
 * Generate a hero image URL using Cloudflare Image Resizing.
 * Used for single photo pages (1400x1400 fit inside).
 */
export function r2Hero(path: string, size = 1400): string {
  return `${R2_BASE}/cdn-cgi/image/width=${size},height=${size},fit=inside/${path.replace(/^\//, "")}`;
}
```

**No build-time image processing.** All resizing done at the edge via Cloudflare Image Resizing (included with R2 public access). This eliminates the biggest build-time bottleneck -- no Sharp processing of 2643 photos.

### R2 Upload (prerequisite migration step)

Before Astro works, all images from `assets/img/` must be uploaded to R2:

```bash
# One-time migration
rclone sync assets/img/ r2:really-lol-media/img/ --progress
# Or: wrangler r2 object put ...
```

Existing frontmatter paths (`image: "img/photo/foo.jpg"`) become R2 keys directly -- no path rewriting needed.

---

## Template Mapping: Hugo to Astro

### Base Layout (`Base.astro`)

Replaces `baseof.html` (`themes/reallylol/layouts/baseof.html`). Structure:

```astro
---
import SiteHeader from "../components/SiteHeader.astro";
import Footer from "../components/Footer.astro";
import "../styles/style.css";

interface Props {
  title?: string;
  description?: string;
  image?: string;        // OG image URL
  section?: string;      // Body class (e.g. "note", "photo")
}

const { title = "really.lol", description, image, section = "" } = Astro.props;
const pageTitle = title === "really.lol" ? title : `${title} | really.lol`;
---
<html lang="en-gb">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{pageTitle}</title>
  {description && <meta name="description" content={description} />}
  <meta property="og:title" content={pageTitle} />
  {description && <meta property="og:description" content={description} />}
  {image && <meta property="og:image" content={image} />}
  <link rel="alternate" type="application/rss+xml" title="really.lol" href="/rss.xml" />
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

### Key Page Templates

| Hugo template | Astro page | Notes |
|---------------|-----------|-------|
| `index.html` | `pages/index.astro` | Reads `data/books/reading.json`, shows first book. Hero image from R2. |
| `photo/section.html` | `pages/photo/[...page].astro` | `getStaticPaths()` with `paginate()`, 24 per page. Uses `r2Thumb()` for grid. |
| `photo/single.html` | `pages/photo/[slug].astro` | `r2Hero()` for main image. Strips `<img>` from rendered content. |
| `single.html` | `pages/post/[slug].astro` | Tags, date, location, content, SeeAlso component. |
| `note/section.html` | `pages/note/[...page].astro` | Artistic header with overlay image from R2. |
| `note/single.html` | `pages/note/[slug].astro` | Overlay design with positioned text. |
| `highlight/section.html` | `pages/highlight/[...page].astro` | Content previews with images/lists stripped. |
| `highlight/single.html` | `pages/highlight/[slug].astro` | Full content with blockquote styling. |
| `links/single.html` | `pages/links/saved.astro` | Client-side pagination from JSON data (keep media-pagination.js or rewrite). |
| `media/single.html` | `pages/books/*.astro`, `pages/films/*.astro` | Separate routes. Data from JSON files. Client-side pagination. |
| `taxonomy.html` | `pages/tags/index.astro` | All tags with counts and pretty names. |
| `term.html` | `pages/tags/[tag]/[...page].astro` | Paginated tag archive. |

### Shortcode to Component Mapping

| Hugo shortcode | Astro component | Behaviour |
|----------------|----------------|-----------|
| `{{< image >}}` | `<ContentImage>` | Accepts src, alt, caption, method, size, loading. Resolves via `r2Url()`. |
| `{{< booktable >}}` | `<BookGrid>` | Reads JSON, renders card grid with client-side pagination. |
| `{{< filmtable >}}` | `<FilmTable>` | Reads JSON, renders table with client-side pagination. |
| `{{< audio >}}` | `<audio>` | Trivial, inline in content. |

**Shortcode migration in markdown:** The Hugo shortcode syntax (`{{< image src="..." >}}`) doesn't render in Astro. The recommended approach is a **remark plugin** that transforms `{{< image src="..." >}}` into HTML during markdown processing. This avoids touching 3000+ content files.

### Remark Plugin: `remark-hugo-shortcodes`

```ts
// astro/src/lib/remark-hugo-shortcodes.ts
// Transforms {{< image src="..." alt="..." >}} into <img> tags with R2 URLs
// Transforms {{< audio src="..." >}} into <audio> tags
// Transforms {{< booktable key="..." >}} and {{< filmtable key="..." >}} into placeholder divs
//   (these pages are rebuilt entirely in Astro, so shortcodes in media/_*.md are dead code)
```

---

## CSS: Direct Reuse

The existing CSS is vanilla with no Hugo dependencies. Copy the 8 CSS files from `themes/reallylol/static/css/` to `astro/src/styles/` and import `style.css` in the base layout. Zero changes needed:

- `body.note` class applied via the `section` prop on `Base.astro`
- All BEM classes, custom properties, and media queries work as-is
- Cascade layers (`@layer reset, base, layout, components, specials, utilities`) supported by all modern browsers

### Source files to copy
- `themes/reallylol/static/css/style.css` -> `src/styles/style.css`
- `themes/reallylol/static/css/_variables.css` -> `src/styles/_variables.css`
- `themes/reallylol/static/css/_reset.css` -> `src/styles/_reset.css`
- `themes/reallylol/static/css/_base.css` -> `src/styles/_base.css`
- `themes/reallylol/static/css/_layout.css` -> `src/styles/_layout.css`
- `themes/reallylol/static/css/_components.css` -> `src/styles/_components.css`
- `themes/reallylol/static/css/_specials.css` -> `src/styles/_specials.css`
- `themes/reallylol/static/css/_utilities.css` -> `src/styles/_utilities.css`

---

## RSS Feed (`src/pages/rss.xml.ts`)

Using `@astrojs/rss`:

```ts
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = await getCollection("post");
  const notes = await getCollection("note");
  const highlights = await getCollection("highlight");
  const photos = await getCollection("photo");

  const allItems = [
    ...posts.map(p => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/post/${p.slug}/`,
      description: "...",  // Rendered content
    })),
    ...notes.map(n => ({
      title: n.data.title,
      pubDate: n.data.date,
      link: `/note/${n.slug}/`,
    })),
    ...highlights.map(h => ({
      title: h.data.title,
      pubDate: h.data.date,
      link: `/highlight/${h.data.slug}/`,
    })),
    ...photos.map(p => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/photo/${p.slug}/`,
      description: "This post is a photo. Visit really.lol to view it.",
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "really.lol",
    description: "Jack Reid's blog",
    site: context.site,
    items: allItems,
  });
}
```

---

## Sitemap

`@astrojs/sitemap` in `astro.config.ts`. Custom priorities via the `serialize` option to match current sitemap structure:

```ts
sitemap({
  serialize(item) {
    if (item.url === "https://really.lol/") item.priority = 1.0;
    else if (item.url.startsWith("https://really.lol/post")) item.priority = 0.6;
    else if (item.url.startsWith("https://really.lol/photo")) item.priority = 0.5;
    else if (item.url.startsWith("https://really.lol/note")) item.priority = 0.3;
    return item;
  },
})
```

---

## Pagination Strategy

All pagination is server-rendered at build time using Astro's `paginate()` in `getStaticPaths()`. This replaces Hugo's `Paginator` and eliminates the need for client-side pagination JS on content pages.

**Exception:** Books, films, and saved links pages remain client-side paginated (they render from JSON data files, not content collections). Keep `media-pagination.js` or rewrite as a small Astro island component.

---

## "See Also" / Related Content

`src/lib/related.ts`: Given a post's tags, find other posts sharing the most tags (weighted). This replicates Hugo's `.Site.RegularPages.Related` which uses tag overlap with weight 100.

```ts
export function getRelated(
  currentSlug: string,
  currentTags: string[],
  allPosts: { slug: string; data: { title: string; tags?: string[] } }[],
  limit = 5
) {
  return allPosts
    .filter(p => p.slug !== currentSlug)
    .map(p => ({
      ...p,
      score: (p.data.tags ?? []).filter(t => currentTags.includes(t)).length,
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

---

## Astro Config (`astro.config.ts`)

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
    remarkPlugins: [remarkHugoShortcodes],
    shikiConfig: { theme: "dracula" },
  },
});
```

**Static output** -- same as Hugo, deployed to Cloudflare Pages. No server needed. If you later want on-demand rendering for large photo archives, switch to `output: "hybrid"` with the `@astrojs/cloudflare` adapter and mark photo pages as `export const prerender = false`.

---

## Build Performance with 3000+ Pages

- **No image processing at build** (R2 + Cloudflare Image Resizing handles it) -- this is the biggest win
- Astro content collections are file-system cached between builds
- If full static builds become slow, `output: "hybrid"` lets you server-render photo pages on-demand while keeping posts/notes/highlights prerendered
- Incremental builds: not native to Astro yet, but Cloudflare Pages supports build caching

---

## What Gets Reused vs Rewritten

### Reused as-is
- **All 8 CSS files** -- copy to `src/styles/`, zero changes
- **`scripts/lib/`** -- frontmatter.ts, slugify.ts, dates.ts, json.ts, exec.ts, paths.ts, prompt.ts, picker.ts (CLI tools are Hugo-independent)
- **`scripts/commands/sync.ts`** -- data sync is CMS-independent, writes JSON that Astro reads
- **`scripts/commands/validate.ts`** -- frontmatter validation still works on markdown
- **`data/*.json`** -- read directly by Astro pages
- **`media-pagination.js`** -- client-side pagination for books/films/links
- **Playwright tests** -- update base URL, keep structure

### Rewritten for Astro
- **Hugo templates** (`.html`) --> Astro components (`.astro`)
- **Hugo shortcodes** --> Remark plugin + Astro components
- **Hugo image pipeline** (`.Fit`, `.Resize`) --> R2 URLs + Cloudflare Image Resizing
- **Hugo RSS template** --> `@astrojs/rss` endpoint
- **Hugo sitemap** --> `@astrojs/sitemap` with custom serialisation
- **Hugo pagination** (`.Paginator`) --> Astro `paginate()` in `getStaticPaths()`
- **Hugo related content** --> Custom `getRelated()` function

### Retired
- **`config.toml`** --> `astro.config.ts`
- **`themes/reallylol/layouts/`** --> replaced by `src/` components and pages
- **`scripts/commands/bundle.ts`** --> page bundles are a Hugo concept; images on R2 make this irrelevant

---

## Migration Sequence

1. **Upload images to R2** -- `rclone sync assets/img/ r2:really-lol-media/img/`
2. **Scaffold Astro project** in `astro/` directory alongside Hugo
3. **Copy CSS** from theme to `src/styles/`
4. **Set up content collections** -- symlink or copy content directories, write Zod schemas
5. **Write remark plugin** for Hugo shortcode syntax (`{{< image >}}`, `{{< audio >}}`)
6. **Build components** -- Base layout, SiteHeader, Footer, icons, ContentImage
7. **Build pages** one content type at a time: posts first (simplest), then photos (most numerous), then notes, highlights
8. **Build data pages** -- books, films, links (read JSON, client-side pagination)
9. **Build tag pages** -- taxonomy index + per-tag archives
10. **Add RSS + sitemap**
11. **Run Playwright tests** against Astro dev server, fix visual regressions
12. **Deploy** -- switch Cloudflare Pages build command from `hugo` to `astro build`
13. **Remove Hugo** -- delete `config.toml`, `themes/`, update CLAUDE.md

---

## CMS Transition (future, after CMS is picked)

The content collections layer is the seam. When the CMS is ready:

1. Define matching content types in the CMS
2. Write a migration script: read markdown + frontmatter, POST to CMS API (similar pattern to existing `scripts/commands/sync.ts`)
3. Replace `getCollection("post")` calls with CMS API fetches (e.g. Payload REST API, Directus SDK)
4. Content collection schemas become the CMS schema reference
5. `src/content/` directory and markdown files can be removed

The Astro components, CSS, pages, and routing remain unchanged.

---

## Verification

After each migration step, verify:

- `cd astro && npx astro dev` -- dev server on localhost:4321
- Visual comparison against current Hugo site at localhost:1313
- Playwright tests adapted for Astro dev server (update `baseURL` in `playwright.config.ts`)
- Lighthouse audit for performance (especially photo grid pages)
- RSS feed validates at W3C validator
- Sitemap includes all expected URLs with correct priorities
- All internal links resolve (no 404s)
- OG images render correctly on social media preview tools
