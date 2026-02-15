# really.lol

Personal blog at https://really.lol. Hugo static site, custom `reallylol` theme, deployed on Cloudflare Pages. British English (`en-gb`).

## Stack

- **Hugo** — static site generator, config in `config.toml`
- **Bun** — JS runtime for scripts (`scripts/cli.ts`) and Playwright tests
- **Task** — project management (`task list`, `task take`, `task complete`)

## Directory Layout

```
content/{post,note,photo,highlight,links,media,about}/  # Markdown content
themes/reallylol/{layouts,static/css}/                   # Theme templates + CSS
data/{books,films}/*.json, links.json, random_photos.json  # JSON data files
scripts/cli.ts                                           # Unified CLI entry point
scripts/commands/{new,sync,validate,bundle}.ts            # Command implementations
scripts/lib/                                             # Shared utilities + tests
```

## Content Types

| Type | Location | Filename | Key fields |
|------|----------|----------|------------|
| post | `content/post/` | `YYYY-MM-DD-slug.md` | title, date, tags (default: journal) |
| note | `content/note/` | `YYYY-MM-DD-slug.md` | title, date |
| photo | `content/photo/` | `YYYY-MM-DD-slug.md` | title, date, image, location, tags |
| highlight | `content/highlight/` | `YYYY-MM-DD-slug.md` | title, date, slug, tags |
| media | `content/post/` | `YYYY-MM-DD-slug.md` | title, slug, date, tags, book_author/movie_released, rating |

Posts with local media should be page bundles (`<slug>/index.md`). Convert with `bun run cli bundle to-bundle`.

## CLI Quick Reference

All scripts: `bun run cli <command> [subcommand]`. Run without args for help.

```
bun run cli new post|note|photo|media    # Create content (interactive)
bun run cli sync books|films|links|photos|all  # Sync data sources
bun run cli validate                     # Frontmatter validation (stdin)
bun run cli bundle to-bundle|to-post     # Convert post format
```

## Common Commands

```bash
hugo server -D --port 1313        # Dev server
bun run test                      # Playwright tests
bun run screenshot:all            # Visual screenshots
bun test scripts/                 # CLI unit tests
```

## Task Management

Use `task` CLI: `task list` → `task take $id` → `task note $id "finding"` → `task complete $id`

## Further Reference

- Detailed CLI docs: `docs/scripts.md`
- Frontend dev workflow: `docs/frontend-workflow.md`
