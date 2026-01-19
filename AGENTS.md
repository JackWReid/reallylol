# really.lol - AI agent information

## Prompt

Do not stop to ask me anything. Use the parallel task tool to do everything in parallel without stopping. Do not update the todos in-between. Just spawn all sub-tasks as sub-agents and let them complete. 

Store your plans and notes in `docs/`.

## Project Overview

This is a Hugo-based personal blog and book tracking website hosted at https://really.lol. The site features:

- Personal blog posts and highlights
- Photo galleries
- Book and media tracking
- Note-taking system

## Architecture

### Project Structure

```bash
reallylol/
├── config.toml           # Hugo configuration
├── content/              # Site content (markdown files)
│   ├── highlight/        # Article highlights and commentary
│   ├── photo/           # Photo posts with metadata
│   ├── note/            # Personal notes and quick thoughts
│   ├── media/           # Reading/watching lists (index pages)
│   ├── post/            # Standard blog posts
│   ├── links/           # Link posts
│   └── about/           # About pages (now, uses)
├── archetypes/          # Hugo content templates
│   ├── highlight.md     # Template for highlights
│   ├── note.md          # Template for notes
│   ├── photo.md         # Template for photos
│   ├── post.md          # Template for posts
│   └── media.md         # Template for media logs
├── themes/              # Hugo theme files
│   └── reallylol/       # Custom theme
├── static/              # Static assets (served as-is)
│   ├── img/             # Image files
│   │   └── photo/       # Photo post images
│   ├── audio/           # Audio files
│   └── docs/            # Documents (e.g., CV)
├── assets/              # Source assets (processed by Hugo)
│   └── img/             # Source images
├── data/                # Data files (JSON, accessible in templates)
│   ├── books/           # Book data (toread.json, reading.json, read.json)
│   ├── films/           # Film data (watched.json, towatch.json)
│   ├── content_config.json  # Content configuration (exclude_tags, map_tag_names)
│   └── random_photos.json  # Precomputed eligible photos for random selection
├── scripts/             # Utility scripts for content management
└── docs/                # Documentation
```

### Hugo Configuration

The site is configured via `config.toml`:

```toml
baseURL = "https://really.lol"
languageCode = "en-gb"
title = "really.lol"
theme = "reallylol"
buildFuture = true
timeout = 999999

[pagination]
pagerSize = 10

[markup]
[markup.highlight]
style = "dracula"

[markup.goldmark.renderer]
unsafe = true

[related]
[[related.indices]]
name = "tags"
weight = 100
```

Key configuration features:

- **Theme**: Custom `reallylol` theme
- **Language**: English (GB)
- **Syntax highlighting**: Dracula theme
- **Pagination**: 10 items per page
- **Build future posts**: Enabled (allows scheduling posts)
- **Unsafe HTML**: Enabled for content flexibility
- **Related content**: Based on tags with weight 100

### Content Types and Archetypes

The site uses custom Hugo archetypes for different content types:

1. **highlight** - Article highlights and commentary
   - Template: `archetypes/highlight.md`
   - Location: `content/highlight/`
   - Fields: title, date, slug, tags
   - Format: Blockquote for highlight text, attribution line

2. **note** - Quick personal notes and thoughts
   - Template: `archetypes/note.md`
   - Location: `content/note/`
   - Filename format: `YYYY-MM-DD-slug.md`
   - Fields: title, date
   - Auto-generated slug from note text

3. **photo** - Photo posts with metadata
   - Template: `archetypes/photo.md`
   - Location: `content/photo/`
   - Filename format: `YYYY-MM-DD-slug.md`
   - Image location: `assets/img/photo/YYYY-MM-DD-slug.jpg` (referenced via Hugo’s asset pipeline)
   - Fields: title, date, image, location, tags
   - Images are resized to max 1400x1400px, converted to JPG
   - Body embeds the photo using the `image` shortcode so Hugo can generate responsive outputs

4. **post** - Standard blog posts
   - Template: `archetypes/post.md`
   - Location: `content/post/`
   - Filename format: `YYYY-MM-DD-slug.md`
   - Fields: title, date, tags (default: journal)
   - Opens in vim after creation
   - Posts that embed local media should be page bundles (`content/post/<slug>/index.md`) with assets stored beside the Markdown. Use `scripts/convert-post-to-bundle.py` to convert a flat post before adding images.

5. **media** - Media log entries (books/movies)
   - Template: `archetypes/media.md`
   - Location: `content/post/` (created as posts with medialog tag)
   - Fields: title, slug, date, tags (medialog, readbook/watchedmovie), book_author, movie_released, media_image, rating
   - Created interactively via `new-media.sh`

### Data Files

The site uses JSON data files in `data/` directory:

- **`data/books/`**: Book lists from Hardcover API
  - `toread.json` - Books to read
  - `reading.json` - Currently reading
  - `read.json` - Books read
  - Updated via `update-books.sh`

- **`data/films/`**: Film lists from Letterboxd export
  - `watched.json` - Films watched
  - `towatch.json` - Films to watch
  - Updated via `update-films.sh`

- **`data/content_config.json`**: Content configuration
  - `exclude_tags`: Tags to exclude from random photo selection
  - `map_tag_names`: Tag display name mappings

- **`data/random_photos.json`**: Precomputed eligible photos
  - Array of photo paths eligible for random selection
  - Updated via `update-random-photos.sh`
  - Used by footer template to avoid build-time computation

## Scripts

### Project Management

Use `task` for task management. The workflow:

1. Check for in progress tasks: `task list --status progress` and pick those up first
2. Check for todo tasks: `task ready`
3. Get more details on your task with `task show $id`
4. Take the task with `task take $id`
5. If you make key findings during implementation, make a note with `task note $id $content"
6. When you're done on implementation, close the task with `task close $id`
7. If you get blocked, `task block $id`
8. Report back to the user

### Content Creation Scripts

#### `scripts/new-note.sh`

Creates a new note post with auto-generated slug.

**Functionality:**

- Prompts for note text
- Auto-generates slug from note text (lowercase, alphanumeric, dashes, max 50 chars)
- Creates file: `content/note/YYYY-MM-DD-slug.md`
- Frontmatter: title (from note), date (current timestamp)

**Dependencies:** None

**Usage:**

```bash
./scripts/new-note.sh
```

#### `scripts/new-photo.sh`

Creates a new photo post from an image file with EXIF extraction and image processing.

- Requires image path as argument
- Extracts creation date from EXIF data (DateTimeOriginal)
- Prompts for: slug, title, location, tags (comma-separated), alt text
- Copies image to `assets/img/photo/YYYY-MM-DD-slug.jpg`
- Resizes to max 1400x1400px (maintains aspect ratio)
- Converts to JPG format, quality 100%
- Creates file: `content/photo/YYYY-MM-DD-slug.md`
- Frontmatter: title, date (from EXIF), image path, location, tags (YAML list), image shortcode referencing the asset

**Dependencies:**

- `exiftool` - For EXIF data extraction
- `imagemagick` (mogrify) - For image processing

**Usage:**

```bash
./scripts/new-photo.sh path/to/photo.jpg
```

#### `scripts/new-post.sh`

Creates a new blog post and opens in editor.

**Functionality:**

- Prompts for slug and title
- Creates file: `content/post/YYYY-MM-DD-slug.md`
- Frontmatter: title, date (current date), tags (default: journal)
- Opens file in vim for editing

**Dependencies:** `vim` (or default editor)

**Usage:**

```bash
./scripts/new-post.sh
```

#### `scripts/new-media.sh`

Interactive script to create medialog posts for books or movies using fzf.

**Functionality:**

- Uses `fzf` to browse and select from books (read.json) and movies (watched.json)
- Shows checkmarks (✓) for items that already have posts
- Automatically handles duplicate slugs by appending numbers (-1, -2, etc.)
- Creates post in `content/post/` with medialog tag
- For books: adds readbook tag, book_author field
- For movies: adds watchedmovie tag, movie_released field
- Includes media_image if available (books from Hardcover)
- Opens file in vim after creation

**Performance Optimizations:**

- Post index caching: Single directory scan builds index once (~1.5s) instead of checking per-item
- File-based index: Uses temporary file instead of associative arrays for bash 3.2 compatibility
- Batch processing: All operations (slugify, lookup, format) happen in single awk pass (~30ms)
- In-process slugification: Runs inside awk instead of spawning external processes
- Benchmark mode: Use `--benchmark` flag to see performance metrics

**Dependencies:**

- `jq` - For JSON parsing
- `fzf` - For interactive selection

**Usage:**

```bash
./scripts/new-media.sh              # Interactive mode
./scripts/new-media.sh --benchmark  # Benchmark mode (no fzf)
```

#### `scripts/convert-post-to-bundle.py`

Converts an existing flat post into a page bundle so its media can live beside `index.md`.

- Lists non-bundle posts in reverse chronological order (uses `fzf` if available) and moves the selected Markdown file into `content/post/<slug>/index.md`.
- Copies any referenced `/img/...` assets (shortcodes or Markdown images, including `image:` front matter) into the bundle and rewrites the references to use relative paths + the `photo` shortcode.
- Supports automation flags: `--slug <filename>`, `--path <path/to/post.md>`, and `--all-media` (converts every flat post that currently references `/img/`).

**Dependencies:**

- `python3`
- `fzf` (optional, for selection UI)

**Usage:**

```bash
# interactive picker
./scripts/convert-post-to-bundle.py

# convert a specific file
./scripts/convert-post-to-bundle.py --slug 2021-10-08-museums-of-oxford

# migrate every flat post that currently embeds /img/ assets
./scripts/convert-post-to-bundle.py --all-media
```

### Data Update Scripts

#### `scripts/update-books.sh`

Updates book data from Hardcover API using the cover CLI.

**Functionality:**

- Fetches three book lists: toread, reading, read
- Uses cover CLI with `--blog` format
- Writes to `data/books/toread.json`, `reading.json`, `read.json`
- Handles "No books found" messages by converting to empty JSON arrays
- Uses temporary files to avoid corruption on failure

**Dependencies:**

- `cover` CLI - Must be in PATH (https://github.com/jackreid/cover)
- `HARDCOVER_API_KEY` environment variable

**Setup:**

1. Install cover CLI:

   ```bash
   git clone https://github.com/jackreid/cover.git
   cd cover
   go build -o cover
   mv cover /usr/local/bin/  # or add to PATH
   ```

2. Create Hardcover account at https://hardcover.app
3. Get API key from account settings
4. Set environment variable:

   ```bash
   export HARDCOVER_API_KEY="your-api-key-here"
   ```

**Usage:**

```bash
./scripts/update-books.sh
```

#### `scripts/update-films.sh`

Updates film data from Letterboxd export.

**Functionality:**

- Supports two modes:
  - **Automatic mode**: Downloads export from Letterboxd using cookies
  - **Manual mode**: Processes pre-downloaded export directory
- Processes `watchlist.csv` and `diary.csv` from export
- Uses SQLite3 to process CSV data (via `letterboxd-parse.sql`)
- Generates JSON files: `data/films/watched.json`, `towatch.json`
- Handles cookie authentication via file or environment variable

**Dependencies:**

- `sqlite3` - For CSV processing
- `unzip` - For automatic mode (extracting export)
- `curl` - For automatic mode (downloading export)

**Cookie Setup:**

- Default location: `./creds/letterboxd-cookies.txt`
- Environment variable: `LETTERBOXD_COOKIE_FILE` or `LETTERBOXD_COOKIES`
- Get cookies from browser after logging into Letterboxd

**Usage:**

```bash
# Automatic mode (downloads export)
./scripts/update-films.sh

# Manual mode (processes existing export)
./scripts/update-films.sh /path/to/extracted/export/
```

#### `scripts/letterboxd-parse.sql`

SQL queries for processing Letterboxd CSV exports. Used by `update-films.sh` via sqlite3.

**Functionality:**

- Creates temporary SQLite database from CSV files
- Processes watchlist.csv and diary.csv
- Generates JSON-compatible output for watched and to-watch films

#### `scripts/update-random-photos.sh`

Precomputes eligible photos for random selection in footer.

**Functionality:**

- Scans all photos in `content/photo/`
- Filters out photos with tags listed in `data/content_config.json`'s `exclude_tags`
- Writes eligible photo paths to `data/random_photos.json`
- Reduces build-time computation by pre-filtering photos
- Shows progress during scanning

**Dependencies:**

- `jq` - For JSON parsing and generation

**Usage:**

```bash
./scripts/update-random-photos.sh
```

**When to run:**

- After adding new photos
- After modifying photo tags
- After updating `exclude_tags` in `data/content_config.json`
- Before pushing to production (to ensure fast builds)

## Common Commands

### Development

```bash
# Start Hugo development server (with live reload)
hugo server

# Start server on custom port
hugo server --port 8080

# Start server accessible from external devices
hugo server --bind=0.0.0.0

# Start server with drafts enabled
hugo server --buildDrafts

# Build the site for development
hugo

# Build for production (minified, optimized)
hugo --minify

# Build with specific base URL
hugo --baseURL="https://your-domain.com" --minify
```

### Content Creation

```bash
# Create new note
./scripts/new-note.sh

# Create new photo post
./scripts/new-photo.sh path/to/photo.jpg

# Create new blog post
./scripts/new-post.sh

# Create new media log entry (interactive)
./scripts/new-media.sh
```

### Data Updates

```bash
# Update book data (requires HARDCOVER_API_KEY)
./scripts/update-books.sh

# Update film data (automatic mode, requires cookies)
./scripts/update-films.sh

# Update film data (manual mode)
./scripts/update-films.sh /path/to/extracted/export/

# Update random photo pool
./scripts/update-random-photos.sh
```

## Dependencies

### Required

- **Hugo** - Static site generator

  ```bash
  # macOS
  brew install hugo
  
  # Debian/Ubuntu
  sudo apt-get install hugo
  ```

- **Git** - Version control (usually pre-installed)

### Optional (for content management)

- **exiftool** - Photo metadata extraction

  ```bash
  # macOS
  brew install exiftool
  
  # Debian/Ubuntu
  sudo apt-get install libimage-exiftool-perl
  ```

- **ImageMagick** - Image processing (provides `mogrify`)

  ```bash
  # macOS
  brew install imagemagick
  
  # Debian/Ubuntu
  sudo apt-get install imagemagick
  ```

- **SQLite3** - Film data processing

  ```bash
  # macOS (usually pre-installed)
  brew install sqlite3
  
  # Debian/Ubuntu
  sudo apt-get install sqlite3
  ```

- **jq** - JSON processing

  ```bash
  # macOS
  brew install jq
  
  # Debian/Ubuntu
  sudo apt-get install jq
  ```

- **fzf** - Interactive selection (for new-media.sh)

  ```bash
  # macOS
  brew install fzf
  
  # Debian/Ubuntu
  sudo apt-get install fzf
  ```

- **unzip** - For automatic Letterboxd export download

  ```bash
  # Usually pre-installed on macOS/Linux
  ```

- **curl** - For automatic Letterboxd export download

  ```bash
  # Usually pre-installed on macOS/Linux
  ```

### Special Dependencies

- **Go** - For building cover CLI

  ```bash
  # macOS
  brew install go
  
  # Other platforms: https://golang.org/doc/install
  ```

- **Cover CLI** - For book data from Hardcover

  ```bash
  git clone https://github.com/jackreid/cover.git
  cd cover
  go build -o cover
  mv cover /usr/local/bin/  # or add to PATH
  ```

## Environment Variables

### Required for Book Management

- `HARDCOVER_API_KEY` - Hardcover API key for book data

  ```bash
  export HARDCOVER_API_KEY="your-api-key-here"
  ```

### Optional for Film Management

- `LETTERBOXD_COOKIE_FILE` - Path to Letterboxd cookie file
- `LETTERBOXD_COOKIES` - Letterboxd cookies as string

## Deployment

### Static Site Deployment

The site generates static files in the `public/` directory after running `hugo build`. These can be deployed to any static hosting service.

**Build for production:**

```bash
hugo --minify
```

### Common Hosting Platforms

**Cloudflare Pages:**

- Connect Git repository
- Build command: `hugo --minify`
- Build output directory: `public`
- Environment variables: Set `HARDCOVER_API_KEY` if needed

**Netlify:**

- Connect Git repository
- Build command: `hugo --minify`
- Publish directory: `public`

**Vercel:**

- Connect Git repository
- Framework preset: Hugo
- Build command: `hugo --minify`
- Output directory: `public`

**GitHub Pages:**

- Use GitHub Actions with Hugo workflow
- Deploy from `public/` directory

### Environment Variables for Production

Set these in your hosting platform:

- `HARDCOVER_API_KEY` - For book updates (if using GitHub Actions)
- `HUGO_VERSION` - Specify Hugo version if needed

## Development Best Practices

1. **Always run from project root directory**
2. **Test builds locally before deploying**
3. **Use version control for all changes**
4. **Keep dependencies up to date**
5. **Backup data files before running update scripts**
6. **Use descriptive commit messages**
7. **Run `update-random-photos.sh` before pushing photo changes**
8. **Test scripts in a staging environment first**

## Troubleshooting

### Hugo Build Fails

1. Check Hugo version: `hugo version`
2. Verify config syntax: `hugo config`
3. Check for missing theme: `ls themes/` (should contain 'reallylol')

### Content Not Appearing

1. Check front matter format (proper YAML)
2. Check date format: `2025-07-19T10:00:00`
3. Check file location (correct `content/` subdirectory)
4. Check drafts: `hugo server --buildDrafts`

### Scripts Not Working

1. Check permissions: `chmod +x scripts/*.sh`
2. Check dependencies: `which exiftool`, `which cover`, etc.
3. Run from project root: `pwd` (should end in 'reallylol')
4. Check environment variables: `echo $HARDCOVER_API_KEY`

### Image Processing Issues

1. Check ImageMagick: `convert -version`
2. Check file permissions: `ls -la static/img/`
3. Check EXIF data: `exiftool path/to/image.jpg`

## Todo Items

- Move content images to Cloudflare R2 (in a GitHub workflow?)
- Update new image script to be compatible with Cloudflare images
