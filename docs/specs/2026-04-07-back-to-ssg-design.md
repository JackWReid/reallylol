# Design: Static site migration (back to SSG)

Spec for migrating really.lol from the current CMS-backed architecture (Hono Worker + D1 + R2) to a pure static site generator setup. All content becomes markdown files with frontmatter, library data becomes committed JSON fixtures, media stays in the existing R2 bucket unchanged.

## Problem

The site has three scales of content:

- **Editorial content** (~420 items): blog posts, notes, highlights, pages. Handwritten markdown at manageable scale.
- **Library data** (~2500 items): books, films, links synced from Hardcover, Letterboxd, Raindrop. Structured data rendered into list pages.
- **Photos** (~2600 items): the reason the CMS exists. Too many for a comfortable Hugo build, too large for git-tracked image files.

The CMS solved the photo problem but introduced operational complexity: a Hono Worker, D1 database, R2 media registry, admin UI, build-time API dependency, and hybrid SSR/SSG rendering. For a personal blog, this is too much infrastructure.

Photos are the only content type that actually needed the CMS. The solution: keep photo image files in R2 (they were always there), but represent the photo posts themselves as markdown files like everything else. Accept the longer build time.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Rendering | Pure SSG, no SSR | Simplicity. Accept 3-5 min builds for ~6000 static pages. |
| Content storage | Markdown files in Astro content collections | Framework-native, versionable, no external dependency at build time. |
| Library data | JSON fixtures committed to repo | Treated like test fixtures. CLI syncs them, git tracks them. |
| Photo images | Existing R2 bucket, unchanged | No restructure, no new bucket, no risk. |
| Pagination | Astro `getStaticPaths` + `paginate()` | Static pagination, zero client JS. 40 items per page. |
| Client JS | None | Preact removed. All pages are static HTML + CSS. |
| Shortcodes | Replaced with standard markdown/HTML | Hugo shortcodes eliminated during migration. No custom remark plugin. |
| Site adapter | None (pure Cloudflare Pages static) | No Workers adapter needed. |
| CMS | Decommissioned after migration | Worker + D1 deleted once the static site is verified. |

## Project structure

```
cli/
  src/
    commands/
      create.ts         # create post/photo/note/highlight
      media.ts          # upload, verify, orphans
      library.ts        # sync books/films/links
      migrate.ts        # one-time CMS-to-SSG migration
    lib/
      r2.ts             # S3-compatible R2 client
      prompts.ts        # interactive CLI prompts
    index.ts            # entry point + command routing
creds/
  letterboxd-cookies.txt
  raindrop-token
docs/
site/
  public/
    favicon.png
    manifest.json
    robots.txt
    rss.xsl
    sitemap.xsl
    docs/cv.pdf
  src/
    content/
      blog/
        YYYY-MM-DD-slug.md
      note/
        YYYY-MM-DD-slug.md
      photo/
        YYYY-MM-DD-slug.md
      highlight/
        YYYY-MM-DD-slug.md
    data/
      books-read.json
      books-reading.json
      books-toread.json
      films-watched.json
      films-towatch.json
      links.json
    images/
      audubon-falcon.jpg
      angel-small.png
      solar-system.jpg
    pages/
      index.astro
      page/[page].astro
      blog/[...page].astro
      notes/[...page].astro
      photos/[...page].astro
      highlights/[...page].astro
      post/[slug].astro
      note/[slug].astro
      photo/[slug].astro
      highlight/[slug].astro
      library/
        read.astro
        reading.astro
        toread.astro
        watched.astro
        towatch.astro
      tags/
        index.astro
        [tag]/[...page].astro
      links.astro
      blogroll.md
      now.md
      uses.md
      index.xml.ts
      404.astro
    components/
      SiteHeader.astro
      Footer.astro
      PagePreamble.astro
      TagList.astro
      ContentImage.astro
      Pagination.astro
    layouts/
      Base.astro
      Plain.astro
    lib/
      images.ts
      tags.ts
      summary.ts
      related.ts
    styles/
      _reset.css
      _variables.css
      _base.css
      _layout.css
      _components.css
      _specials.css
      _utilities.css
  content.config.ts
  astro.config.ts
  wrangler.toml           # CF Pages config (minimal, may not be needed)
package.json
tsconfig.json
```

### Deleted

Everything not listed above gets removed:

- `cms/` - the entire CMS Worker, admin UI, database schema, routes, migrations
- `shared/` - shared types (no longer needed without CMS)
- `scripts/` - legacy CLI (superseded by new `cli/`)
- Root `wrangler.toml` - CMS Worker config
- `.dev.vars` - CMS dev secrets
- `test-results/`, `tmp/`, `dist/` - build artefacts
- `site/src/lib/cms-loader.ts`, `site/src/lib/cms-data.ts` - CMS content loaders
- `site/src/lib/remark-hugo-shortcodes.ts` - Hugo shortcode remark plugin
- `site/src/components/HomeFeed.tsx`, `LibraryTimeline.tsx`, `LinksList.tsx`, `PhotoGrid.tsx` - Preact Islands
- Preact dependency from `package.json` and `astro.config.ts`

## Content collections

### Blog (`src/content/blog/`)

Filename: `YYYY-MM-DD-slug.md`

```yaml
---
title: "Post title"
date: 2026-03-15
subtitle: ""                # optional
tags: [journal]
book_author: ""             # optional, medialog posts
movie_released: ""          # optional, medialog posts
media_image: ""             # optional, R2 key or external URL
rating: 4                   # optional, 1-5
url: ""                     # optional, link posts
---

Post body in standard markdown.
```

### Note (`src/content/note/`)

```yaml
---
title: "Quick thought"
date: 2026-03-15
---

Note body.
```

### Photo (`src/content/photo/`)

```yaml
---
title: "Evening light"
date: 2026-03-15
image: img/photo/evening-light.jpg
location: "London"
tags: [street, london]
instagram: false
---
```

The `image` field is an R2 key. The site's `lib/images.ts` helpers prepend `https://media.really.lol/` at render time, same as the current implementation.

### Highlight (`src/content/highlight/`)

```yaml
---
title: "Article title"
date: 2026-03-15
link: "https://example.com/article"
tags: [tech]
---

> The quoted text from the article.
```

### Content config (`content.config.ts`)

Defines Zod schemas for each collection, validating frontmatter types. Replaces the current CMS loader-based config with file-based collection definitions.

```typescript
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    subtitle: z.string().optional(),
    tags: z.array(z.string()).default([]),
    book_author: z.string().optional(),
    movie_released: z.string().optional(),
    media_image: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),
    url: z.string().url().optional(),
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
    tags: z.array(z.string()).default([]),
    instagram: z.boolean().default(false),
  }),
});

const highlight = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    link: z.string().url(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, note, photo, highlight };
```

## Library data

JSON fixtures in `src/data/`, committed to git, written by the CLI sync commands.

### Books (`books-read.json`, `books-reading.json`, `books-toread.json`)

```json
[
  {
    "title": "The Rings of Saturn",
    "author": "W.G. Sebald",
    "date_updated": "2026-03-01",
    "image_url": "https://hardcover.app/...",
    "hardcover_url": "https://hardcover.app/..."
  }
]
```

### Films (`films-watched.json`, `films-towatch.json`)

```json
[
  {
    "name": "Stalker",
    "year": "1979",
    "date_updated": "2026-02-14"
  }
]
```

### Links (`links.json`)

```json
[
  {
    "title": "Article title",
    "url": "https://example.com",
    "date": "2026-03-20",
    "excerpt": "Short description",
    "cover": "https://...",
    "tags": ["tech", "web"]
  }
]
```

Library pages (`library/read.astro`, etc.) import the JSON directly and render it server-side into static HTML. No client JS, no pagination - full dataset on one page.

## Pagination

All collection list pages use Astro's `getStaticPaths` with `paginate()`, 40 items per page.

### Route mapping

| Route pattern | Page 1 URL | Page N URL | Content |
|---------------|-----------|------------|---------|
| `pages/index.astro` | `/` | n/a | Page 1 of mixed feed |
| `pages/page/[page].astro` | n/a | `/page/2/` | Pages 2+ of mixed feed |
| `pages/blog/[...page].astro` | `/blog/` | `/blog/2/` | Blog posts |
| `pages/photos/[...page].astro` | `/photos/` | `/photos/2/` | Photos |
| `pages/notes/[...page].astro` | `/notes/` | `/notes/2/` | Notes |
| `pages/highlights/[...page].astro` | `/highlights/` | `/highlights/2/` | Highlights |
| `pages/tags/[tag]/[...page].astro` | `/tags/london/` | `/tags/london/2/` | Tagged content |

The homepage is a special case: `index.astro` renders page 1, `page/[page].astro` handles subsequent pages. Both share the same data-fetching logic (merged feed of all content types, sorted by date).

A shared `Pagination.astro` component renders prev/next links and page numbers.

### URL changes from current site

Detail pages use singular nouns to avoid route conflicts with paginated list pages in the same namespace:

- `/notes/slug` changes to `/note/slug`
- `/highlight/slug` stays the same (already singular)
- `/post/slug` stays the same (already singular)
- `/photo/slug` stays the same (already singular)

The `[...path].astro` catch-all route (currently serving CMS-sourced pages) is removed. All pages are explicit files. If any CMS pages are unaccounted for, add them as explicit `.md` or `.astro` files during migration.

## R2 media

### Bucket

Name: `media-really-lol`, served at `https://media.really.lol`. No changes to structure or contents.

```
audio/
  journal/[audio_slug].m4a          # existing, kept as-is
  [post_slug]/[audio_slug].m4a      # new convention going forward
docs/
  cv.pdf
img/
  photo/[slug].jpg                   # photo post images
  post/[post_slug]/[img_slug].jpg    # images embedded in posts
```

### References in content

Photo frontmatter stores the R2 key:
```yaml
image: img/photo/evening-light.jpg
```

Post bodies use standard markdown or HTML for embedded media:
```markdown
![Alt text](https://media.really.lol/img/post/my-post/diagram.jpg)

<figure>
  <img src="https://media.really.lol/img/post/my-post/photo.jpg" alt="Description">
  <figcaption>Caption text</figcaption>
</figure>

<audio src="https://media.really.lol/audio/my-post/recording.m4a" controls></audio>
```

No Hugo shortcodes. No custom remark plugin. Standard markdown and HTML that Astro processes natively.

### Image helpers (`lib/images.ts`)

Kept from the current site. Prepends the R2 base URL and optionally applies Cloudflare Image Resizing parameters:

- `r2Url(key)` - raw URL: `https://media.really.lol/${key}`
- `r2Thumb(key, size)` - thumbnail with optional CF Image Resizing
- `r2Hero(key, size)` - hero image with optional CF Image Resizing

## Astro configuration

```typescript
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://really.lol",
  output: "static",
  markdown: {
    shikiConfig: { theme: "dracula" },
  },
  integrations: [
    sitemap({
      priority: 0.5,
      customPages: [],
    }),
  ],
});
```

No Cloudflare adapter. No Preact integration. No custom remark plugins. Build output is plain static files deployed to Cloudflare Pages.

### Layouts

`Base.astro` is the universal shell (header, footer, meta). `Plain.astro` wraps Base for standalone markdown pages (`now.md`, `uses.md`, `blogroll.md`) via their `layout` frontmatter field. Collection content types get their per-type structure from the `[slug].astro` page templates directly.

When you want a one-off stylistic treatment for a special page or individual post, reach for a custom layout. Create a new layout in `layouts/`, apply it via frontmatter (`layout: ../../layouts/SpecialLayout.astro`), and keep the one-off styling scoped there rather than adding conditionals to the base templates.

## CLI

Entry point: `bun cli/src/index.ts`, aliased as `bun run cli` in `package.json`.

All commands support `--help`. Commands that create files print the path of the created file. Commands that modify R2 print the affected keys.

### `cli create <type> [options]`

Creates a content markdown file in the appropriate collection directory.

```bash
# Interactive mode (prompts for all fields)
cli create post
cli create photo path/to/image.jpg
cli create note
cli create highlight

# Explicit mode (for agents/scripts)
cli create post --title "Post title" --tags journal --date 2026-04-07
cli create photo path/to/image.jpg --title "Evening light" --location "London" --tags street,london
cli create note --title "Quick thought" --body "The content"
cli create highlight --title "Article" --link "https://example.com" --tags tech --body "> Quoted text"
```

For `create photo`, the command:
1. Uploads the image to R2 at `img/photo/[slug].jpg`
2. Generates `site/src/content/photo/YYYY-MM-DD-slug.md` with the R2 key in frontmatter

For other types, it just generates the markdown file. The slug is derived from the title (lowercase, spaces to hyphens, strip special chars) unless `--slug` is provided.

### `cli media <subcommand>`

```bash
cli media upload <file> [--prefix img/post/my-post]  # Upload to R2, print key
cli media verify                                       # Check all content R2 refs resolve
cli media orphans                                      # List R2 objects not referenced by any content
```

`verify` scans all markdown files in `src/content/`, extracts R2 keys from frontmatter `image` fields and body URLs matching `media.really.lol`, then checks each key exists in the bucket.

`orphans` does the reverse: lists all R2 objects, checks which aren't referenced by any content file.

### `cli library sync <source>`

```bash
# Books (pipe from cover CLI)
cover books --shelf read --json --per-page 2000 | cli library sync books --shelf read

# Films (pipe from curtain CLI)
curtain diary --json --per-page 2000 | cli library sync films --list watched

# Links (fetches from Raindrop API directly)
cli library sync links
```

Each sync command writes the result to the appropriate JSON fixture file in `site/src/data/` and prints a summary (items synced, file path written).

### `cli migrate`

One-time command that exports all content from the live CMS and generates the static site content files.

1. Fetches all content from `https://cms.really.lol/api/content` (paginated)
2. Transforms Hugo shortcodes in bodies to standard markdown/HTML
3. Writes markdown files to `site/src/content/{blog,note,photo,highlight}/`
4. Fetches library data from `/api/data/{books,films,links}`
5. Writes JSON fixtures to `site/src/data/`
6. Fetches page content, writes to `site/src/pages/` (now.md, uses.md, blogroll.md)
7. Prints summary of files written per type

This command gets deleted from the codebase after migration is complete.

### R2 access

The CLI connects to R2 via S3-compatible API using these env vars:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ACCOUNT_ID`
- `R2_BUCKET` (default: `media-really-lol`)

These can be set in the environment or in a `.env` file at the project root.

## Migration strategy

### Step 1: Export content from CMS

Run `cli migrate` against the live CMS. This generates all markdown files and JSON fixtures. Commit the result.

### Step 2: Rewrite the Astro site

- Delete CMS loaders (`cms-loader.ts`, `cms-data.ts`)
- Delete Hugo shortcode remark plugin
- Delete Preact components and Preact dependency
- Rewrite `content.config.ts` with file-based collection schemas
- Rewrite `astro.config.ts` (remove Cloudflare adapter, Preact, remark plugin)
- Rewrite page templates to use `getCollection()` and `getStaticPaths` with `paginate()`
- Rewrite library pages to import JSON fixtures directly
- Add shared `Pagination.astro` component
- Move decorative images from `public/img/layout/` to `src/images/`

### Step 3: Clean up the repo

- Delete `cms/`, `shared/`, `scripts/`
- Delete root `wrangler.toml`, `.dev.vars`
- Remove CMS-related dependencies from `package.json`
- Remove CMS-related scripts from `package.json`
- Update `CLAUDE.md` to reflect new architecture
- Delete `cli migrate` command

### Step 4: Verify

- Build locally: `bun run build`
- Spot-check pages across all content types
- Run `cli media verify` to check all R2 references
- Compare content counts against CMS stats
- Check pagination works for all collection pages
- Check tag pages render correctly

### Step 5: Deploy

- Push to main, Cloudflare Pages builds the static site
- Verify the live site
- Decommission CMS Worker and D1 database (no rush, do it when confident)

### Step 6: Update workflows

- New `package.json` scripts: `dev` (astro dev), `build` (astro build), `deploy` (push to main or wrangler pages deploy)
- Update the `reallylol` skill and `CLAUDE.md` to document new workflows
- Library sync now writes JSON files and requires a git commit + push to deploy
