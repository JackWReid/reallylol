# really.lol

A Hugo-based personal blog and book tracking website.

## Dashboards
- [Cloudflare Pages Deployment](https://dash.cloudflare.com/f163765cc814ca4c341357f282e5d166/pages/view/reallylol)

## Dependencies

### Cover CLI
The `scripts/update-books.sh` script uses the [cover CLI](https://github.com/jackreid/cover) to fetch book data from Hardcover. 

#### Installation
```bash
# Install cover CLI (requires Go)
git clone https://github.com/jackreid/cover.git
cd cover
go build -o cover
# Move binary to PATH or use ./cover directly
```

#### Setup
1. Create a Hardcover account at [hardcover.app](https://hardcover.app)
2. Get your API key from account settings
3. Set the environment variable:
   ```bash
   export HARDCOVER_API_KEY="your-api-key-here"
   ```

#### Usage
```bash
# Update all book data
./scripts/update-books.sh
```

## Development

### Building the Site
```bash
# Start development server
hugo server

# Build for production
hugo build
```

### Creating Content

#### `new-note.sh`
Creates a new note post. Prompts for note text and generates a slug automatically.

**Dependencies:** None

**Usage:**
```bash
./scripts/new-note.sh
```

#### `new-photo.sh`
Creates a new photo post from an image file. Extracts creation date from EXIF data and prompts for metadata (slug, title, location, tags, alt text). Automatically resizes and optimizes the image.

**Dependencies:** 
- `exiftool` (for EXIF data extraction)
- `imagemagick` (for image processing via `mogrify`)

**Usage:**
```bash
./scripts/new-photo.sh path/to/photo.jpg
```

#### `new-post.sh`
Creates a new blog post. Prompts for slug and title, then opens the file in vim for editing.

**Dependencies:** `vim` (or your default editor)

**Usage:**
```bash
./scripts/new-post.sh
```

#### `new-media.sh`
Interactive script to create medialog posts for books or movies. Uses `fzf` to browse and select from your read books and watched movies. Shows checkmarks for items that already have posts. Automatically handles duplicate slugs by appending numbers.

**Dependencies:**
- `jq` (for JSON parsing)
- `fzf` (for interactive selection)
- `vim` (for editing the created post)

**Usage:**
```bash
./scripts/new-media.sh
```

### Updating Media

#### `update-books.sh`
Updates book data from Hardcover using the cover CLI. Fetches books in three categories: to-read, reading, and read.

**Dependencies:**
- `cover` CLI (see Dependencies section above)
- `HARDCOVER_API_KEY` environment variable

**Usage:**
```bash
./scripts/update-books.sh
```

#### `update-films.sh`
Updates film data from Letterboxd export. Supports two modes:
- **Automatic mode**: Downloads the export automatically using cookies
- **Manual mode**: Processes a pre-downloaded and extracted export directory

**Dependencies:**
- `sqlite3` (for processing CSV data)
- `unzip` (for automatic mode)
- `curl` (for automatic mode)

**Setup for automatic mode:**
1. Export your Letterboxd cookies using a browser extension (e.g., "cookies.txt" or "Get cookies.txt LOCALLY")
2. Save cookies to `./creds/letterboxd-cookies.txt` or set `LETTERBOXD_COOKIE_FILE` environment variable
3. Or set `LETTERBOXD_COOKIES` environment variable with cookie string

**Usage:**
```bash
# Automatic mode (requires cookies)
./scripts/update-films.sh

# Manual mode (if you've already downloaded and extracted the export)
./scripts/update-films.sh /path/to/extracted/export/
```

## Content Types
The site uses custom Hugo archetypes for different content types:
- **highlight** - Article highlights and commentary
- **note** - Quick personal notes and thoughts
- **photo** - Photo posts with metadata
- **post** - Standard blog posts

## Configuration
- Theme: `reallylol` (custom theme)
- Language: English (GB)
- Syntax highlighting: Dracula theme
- Pagination: 10 items per page
- Build future posts: enabled

## Todo
- Update `/uses`
