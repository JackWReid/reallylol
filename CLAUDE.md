# really.lol

Personal blog at https://really.lol. Astro site on Cloudflare Pages with a custom CMS on Cloudflare Workers. British English (`en-gb`).

## Architecture

Three sub-projects in one repo:

```
cms/        # CMS Worker (Hono + D1 + R2) - serves API + admin UI at cms.really.lol
site/       # Astro site - fetches from CMS at build time, deployed on CF Pages
cli/        # CMS CLI tool (Bun) - content management, data sync, migration, export
shared/     # Shared TypeScript types
scripts/    # Legacy CLI (pre-CMS) - R2 sync only
```

## Stack

- **Astro 5** with Cloudflare adapter - static site with hybrid SSR (in `site/`)
- **Preact** - Astro Islands for client-side pagination (books, films, links pages)
- **Hono** - CMS API framework on Cloudflare Workers (in `cms/`)
- **D1** (SQLite) - content database
- **R2** - media storage at `media.really.lol`
- **Bun** - JS runtime for CLI, scripts, and tests
- **Drizzle ORM** - database schema and queries
- **Preact + CodeMirror 6** - admin UI (in `cms/ui/`)

## Site Build

Content is fetched from the CMS API at build time via custom Astro content loaders (`site/src/lib/cms-loader.ts`). Markdown bodies are rendered through Astro's pipeline (including remark-hugo-shortcodes). No local content files - the CMS is the single source of truth.

**Hybrid SSR:** Most pages are statically prerendered. Photo detail pages (`/photo/[slug]`) use `prerender = false` and are server-rendered on-demand via CF Workers to avoid building ~2600 static pages. The content store is bundled into the worker, so there is no runtime CMS dependency.

**Data pages** (books, films, links) use Preact Islands (`client:load`) for client-side pagination (24 items per page).

## Content Types

All content is stored in D1, managed via the CMS API or CLI.

| Type | Meta fields | Notes |
|------|-------------|-------|
| **post** | subtitle, book_author, movie_released, media_image, rating, url | Multipurpose: journal, media reviews (tags: medialog), link roundups |
| **note** | (none) | Microblog entries |
| **photo** | image (R2 key), location, instagram | Image path like `img/photo/2024-01-01-slug.jpg` |
| **highlight** | link | Blockquote excerpts from articles/books |
| **page** | layout, url | Static pages: /now, /uses, /links/blogroll, /links/saved |

Tags are stored as a many-to-many relation, not in the meta JSON.

## CMS CLI

Entry: `bun run cms <command>` or `bun cli/src/index.ts <command>`

All commands output JSON by default. Use `--format table` for human-readable output.

```bash
# Content CRUD
cms content list [--type post] [--status published] [--limit 20]
cms content get <type> <slug>
cms content create <type> --title "..." [--body "..." | --file path.md] [--tags a,b] [--meta '{}']
cms content edit <type> <slug> [--title "..." --body "..." --tags a,b --status published]
cms content delete <type> <slug>

# Data sync (pipe from external CLIs)
cover books --shelf read --json | cms sync books --shelf read
curtain diary --json | cms sync films --list watched
cms sync links                      # Pulls from Raindrop API directly

# Media management
cms media upload <path> [--prefix img/photo]
cms media list [--kind image] [--prefix img/photo]
cms media verify                    # Check all content media refs exist in R2

# Export (no-lock-in guarantee)
cms export [--format markdown|json] [--output ./backup]

# One-time migration
cms migrate import [--content-dir path] [--data-dir path]
```

## CMS API

Base URL: `http://localhost:8788` (dev) or `https://cms.really.lol` (prod)

Auth: `Authorization: Bearer <API_KEY>` on all `/api/*` endpoints.

Key endpoints:
- `GET/POST /api/content` - list/create content
- `GET/PUT/DELETE /api/content/:type/:slug` - single content item
- `GET /api/tags` - all tags with counts
- `POST /api/media/upload` - upload to R2
- `POST /api/sync/{books,films,links}` - bulk data sync
- `GET /api/data/{books,films,links,random-photos,config}` - read-only data for site builds
- `POST /api/build/trigger` - trigger CF Pages rebuild
- `GET /api/export` - full content export

## Dev Commands

```bash
bun run dev:cms                     # Start CMS on :8788 (wrangler dev, local D1)
bun run dev:cms:remote              # Start CMS on :8788 (wrangler dev, remote D1)
bun run dev:site                    # Start Astro on :4321
bun run build:ui                    # Build admin UI (Vite -> cms/public/)
bun run build:site                  # Build static site (Astro)
bun run deploy:cms                  # Build UI + deploy CMS Worker
bun run deploy:site                 # Build site + deploy to CF Pages
bun run db:migrate                  # Apply D1 migrations locally
bun run db:migrate:prod             # Apply D1 migrations to remote
bun run test                        # Run tests

# Legacy scripts (R2 sync only)
bun run cli r2 sync                 # Upload local assets to R2
```

**Site build requires CMS running.** Start `bun run dev:cms:remote` (for production data) or `bun run dev:cms` (local data) before `bun run dev:site` or `bun run build:site`. Site env vars are in `site/.env` (gitignored).

## Key Env Vars

- `CMS_API_URL` - CMS base URL (default: http://localhost:8788), set in `site/.env` for builds
- `CMS_API_KEY` - API bearer token (default: dev-test-key), set in `site/.env` for builds
- `API_KEY` - Worker secret for CMS auth
- `CF_PAGES_DEPLOY_HOOK` - Worker secret for build triggering
- `HARDCOVER_API_KEY` - Worker secret for server-side book sync
- `RAINDROP_ACCESS_TOKEN` - Worker secret for server-side link sync

## External Tools

- **cover** CLI - Hardcover.app book tracker (`cover books --shelf read --json`)
- **curtain** CLI - Letterboxd film tracker (`curtain diary --json`)
- Raindrop.io API - saved links (token in `creds/raindrop-token`)

## Common Workflows

**Create a blog post:**
```bash
cms content create post --title "My Post" --tags journal --status draft
# Edit in admin UI at http://localhost:8788, or:
cms content edit post my-post --body "..." --status published
```

**Sync all media catalogs:**
```bash
cover books --shelf read --json --per-page 2000 | cms sync books --shelf read
cover books --shelf reading --json | cms sync books --shelf reading
cover books --shelf toread --json --per-page 2000 | cms sync books --shelf toread
curtain diary --json --per-page 2000 | cms sync films --list watched
curtain watchlist --json --per-page 2000 | cms sync films --list towatch
cms sync links
```

**Publish and rebuild:**
```bash
cms content edit post my-post --status published
curl -X POST -H "Authorization: Bearer $CMS_API_KEY" http://localhost:8788/api/build/trigger
```

## Key Files

- Content loaders: `site/src/lib/cms-loader.ts`, `site/src/lib/cms-data.ts`
- Astro content config: `site/src/content/config.ts`
- Paginated list islands: `site/src/components/PaginatedList.tsx`
- DB schema: `cms/src/db/schema.ts`
- DB migrations: `cms/src/db/migrations/`
- CMS routes: `cms/src/routes/`
- Admin UI: `cms/ui/src/`
- CMS plan: `.claude/plans/rosy-bouncing-wolf.md`
