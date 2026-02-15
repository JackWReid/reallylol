# Scripts CLI Reference

All project scripts are consolidated into a single TypeScript CLI at `scripts/cli.ts`, run via Bun.

## File Structure

```
scripts/
  cli.ts                  # Entry point: argv dispatch
  commands/
    new.ts                # post | note | photo | media
    sync.ts               # books | films | links | photos | all
    validate.ts           # frontmatter validation (stdin interface)
    bundle.ts             # to-bundle | to-post
  lib/
    slugify.ts            # Canonical slugify (lowercase, strip, dash, truncate)
    frontmatter.ts        # Generate + parse YAML frontmatter
    dates.ts              # todayDate(), nowDatetime()
    files.ts              # writeContent(), ensureDir() via Bun.write
    fzf.ts                # fzf subprocess integration via Bun.spawn
    exec.ts               # Wrappers for external tools (exiftool, mogrify, cover)
    json.ts               # Compact JSON writer (one obj per line, git-friendly)
    prompt.ts             # readline-based terminal prompts
    paths.ts              # Project path constants
  pre-commit              # Bash hook, calls bun scripts/cli.ts validate
  lib/__tests__/          # Unit tests for shared utilities (bun test)
```

## Content Creation

### `bun run cli new post`

Creates a new blog post and opens in vim.

- Prompts for slug and title
- Creates file: `content/post/YYYY-MM-DD-slug.md`
- Frontmatter: title, date (current date), tags (default: journal)
- Opens file in vim for editing

### `bun run cli new note`

Creates a new note post with auto-generated slug.

- Prompts for note text
- Auto-generates slug from note text (lowercase, alphanumeric, dashes, max 50 chars)
- Creates file: `content/note/YYYY-MM-DD-slug.md`
- Frontmatter: title (from note), date (current timestamp)

### `bun run cli new photo <image>`

Creates a new photo post from an image file with EXIF extraction and image processing.

- Requires image path as argument
- Extracts creation date from EXIF data (DateTimeOriginal)
- Prompts for: slug, title, location, tags (comma-separated), alt text
- Copies image to `assets/img/photo/YYYY-MM-DD-slug.jpg`
- Resizes to max 1400x1400px, converts to JPG
- Creates file: `content/photo/YYYY-MM-DD-slug.md`

**Dependencies:** `exiftool`, `imagemagick` (mogrify)

### `bun run cli new media [--benchmark]`

Interactive script to create medialog posts for books or movies using fzf.

- Uses `fzf` to browse and select from books (read.json) and movies (watched.json)
- Shows checkmarks (✓) for items that already have posts
- Automatically handles duplicate slugs by appending numbers (-1, -2, etc.)
- Creates post in `content/post/` with medialog tag
- Opens file in vim after creation
- Benchmark mode: `--benchmark` flag shows performance metrics (~5ms for 1500+ items)

**Dependencies:** `fzf`

## Data Sync

### `bun run cli sync books`

Fetches book data from Hardcover API via the cover CLI. Writes `data/books/{toread,reading,read}.json`.

**Dependencies:** `cover` CLI, `HARDCOVER_API_KEY` env var

### `bun run cli sync films [--username=USER]`

Syncs film data from Letterboxd. Scrapes watchlist HTML and fetches RSS diary feed. Writes `data/films/{towatch,watched}.json`.

Default username: `jackreid`

### `bun run cli sync links [--tag=TAG]`

Fetches links from Raindrop.io API. Token from `creds/raindrop-token` file or `RAINDROP_ACCESS_TOKEN` env var. Writes `data/links.json`.

Default tag: `toblog`

### `bun run cli sync photos`

Scans `content/photo/` frontmatter, filters out photos with excluded tags, writes `data/random_photos.json`. Run after adding/modifying photos.

### `bun run cli sync all`

Runs books + links + photos (everything except films).

## Validation

### `bun run cli validate`

Validates Hugo frontmatter. Reads file paths from stdin, exits 1 on failure. Checks:
- Opening/closing `---` markers
- Required `title` field (non-empty)
- Required `date` field (parseable YYYY-MM-DD)
- Photo-specific: `image` field

Used by the pre-commit hook (`scripts/pre-commit`).

## Bundle Conversion

### `bun run cli bundle to-bundle`

Converts a flat post to a page bundle. Moves markdown into `<slug>/index.md`, copies referenced `/img/` assets into the bundle, rewrites paths.

Options: `--slug=NAME`, `--path=PATH`, `--all-media`

### `bun run cli bundle to-post`

Converts empty bundles (only containing `index.md`) back to flat posts.

Options: `--slug=NAME`, `--path=PATH`, `--all`

## Pre-commit Hook

The `scripts/pre-commit` bash script validates staged content files' frontmatter and optionally runs htmltest. Install by symlinking:

```bash
ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
```

## Dependencies

### Required

- **Hugo** — static site generator (`brew install hugo`)
- **Bun** — JavaScript runtime (`brew install bun`)

### Optional (for content management)

- **exiftool** — photo metadata extraction (`brew install exiftool`)
- **ImageMagick** — image processing (`brew install imagemagick`)
- **fzf** — interactive selection for media/bundle commands (`brew install fzf`)
- **cover** CLI — book data from Hardcover (https://github.com/jackreid/cover)

### Environment Variables

- `HARDCOVER_API_KEY` — required for `sync books`
- `RAINDROP_ACCESS_TOKEN` — alternative to `creds/raindrop-token` for `sync links`
