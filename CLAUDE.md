# really.lol

Personal blog at https://really.lol. Pure static Astro site on Cloudflare Pages with a Bun CLI for content management. British English (`en-gb`).

## Architecture

```
site/       # Astro static site - deployed on CF Pages
cli/        # CLI tool (Bun) - content creation, media management, library sync
```

No CMS, no database, no Workers adapter. Content lives in markdown files (Astro content collections) and JSON fixtures committed to the repo.

## Stack

- **Astro 5** - static output, deployed to Cloudflare Pages
- **Bun** - JS runtime for CLI and scripts
- **R2** - media storage at `media.really.lol` (existing bucket, unchanged)
- **@aws-sdk/client-s3** - R2 access from CLI

## Content

All content is markdown in Astro content collections under `site/src/content/`:

| Collection | Directory | Frontmatter | Notes |
|-----------|-----------|-------------|-------|
| **blog** | `content/blog/` | title, date, tags, subtitle, book_author, movie_released, media_image, rating, url | Blog posts, media reviews (medialog tag), link roundups |
| **note** | `content/note/` | title, date | Microblog entries |
| **photo** | `content/photo/` | title, date, image, location, tags, instagram | Image path like `img/photo/2024-01-01-slug.jpg` |
| **highlight** | `content/highlight/` | title, date, link, tags | Blockquote excerpts from articles/books |

Filenames follow `YYYY-MM-DD-slug.md`. Tags are arrays in frontmatter.

## Data Fixtures

Library data lives as committed JSON in `site/src/data/`:

- `books-read.json`, `books-reading.json`, `books-toread.json`
- `films-watched.json`, `films-towatch.json`
- `links.json`
- `config.json` (tag mappings, excluded tags)

## CLI

Entry: `bun run cli` or `bun cli/src/index.ts`

```bash
# Content creation
cli create post --title "..." [--body "..." --tags a,b --subtitle "..."]
cli create photo <image-file> [--title "..." --location "..." --tags a,b]
cli create note --title "..."
cli create highlight --title "..." --link "..." [--body "> quote" --tags a,b]

# Media management
cli media upload <file> [--prefix img/post/slug]
cli media verify              # Check all content media refs exist in R2
cli media orphans             # List R2 objects not referenced by content

# Library sync (pipe from external CLIs)
cover books --shelf read --json | cli library sync books --shelf read
curtain diary --json | cli library sync films --list watched
cli library sync links        # Pulls from Raindrop API directly
```

## Dev Commands

```bash
bun run dev                   # Start Astro dev server on :4321
bun run build                 # Build static site
bun run preview               # Preview built site
bun run deploy                # Build + deploy to CF Pages
bun run test                  # Run tests
```

## Pagination

List pages use Astro's `paginate()` with 40 items per page. Homepage uses a custom `/page/N/` scheme (page 1 is `index.astro`, pages 2+ are `page/[page].astro`).

## Key Files

- Content config: `site/src/content/config.ts`
- Feed logic: `site/src/lib/feed.ts`
- Tag utilities: `site/src/lib/tags.ts`
- Image helpers: `site/src/lib/images.ts`
- Summary generator: `site/src/lib/summary.ts`
- Pagination component: `site/src/components/Pagination.astro`
- Styles: `site/src/styles/`

## Common Workflows

**Create a blog post:**
```bash
cli create post --title "My Post" --tags journal
# Then edit the markdown file in site/src/content/blog/
```

**Sync all media catalogues:**
```bash
cover books --shelf read --json --per-page 2000 | cli library sync books --shelf read
cover books --shelf reading --json | cli library sync books --shelf reading
cover books --shelf toread --json --per-page 2000 | cli library sync books --shelf toread
curtain diary --json --per-page 2000 | cli library sync films --list watched
curtain watchlist --json --per-page 2000 | cli library sync films --list towatch
cli library sync links
```

**Deploy:**
```bash
bun run deploy
# Or just git push — CF Pages builds automatically
```

## External Tools

- **cover** CLI - Hardcover.app book tracker (`cover books --shelf read --json`)
- **curtain** CLI - Letterboxd film tracker (`curtain diary --json`)
- Raindrop.io API - saved links (token in `creds/raindrop-token`)

## Key Env Vars

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` - R2 credentials for CLI media commands
- `R2_BUCKET` - R2 bucket name (default: `media-really-lol`)
- `RAINDROP_ACCESS_TOKEN` - Raindrop API token for link sync
