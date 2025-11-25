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

## Project Structure
- `content/` - Main content directory with markdown files
  - `highlight/` - Blog post highlights and articles
  - `photo/` - Photo posts with metadata
  - `note/` - Personal notes and quick thoughts
  - `media/` - Reading lists and media tracking
  - `about/` - About pages (now, uses)
- `scripts/` - Utility scripts for content management
- `themes/` - Hugo theme files
- `static/` - Static assets
- `assets/img/` - Image assets

## Key Scripts and Tools

### Book Management
- `scripts/update-books.sh` - Updates book data using the cover CLI
- Requires the [cover CLI](https://github.com/jackreid/cover) and Hardcover API key
- Environment variable: `HARDCOVER_API_KEY`

### Content Management Scripts
- `scripts/new-note.sh` - Creates new note posts (prompts for note text, auto-generates slug)
- `scripts/new-photo.sh` - Creates new photo posts (requires image path, extracts EXIF data, prompts for metadata)
- `scripts/new-post.sh` - Creates new blog posts (prompts for slug and title, opens in vim)
- `scripts/new-media.sh` - Interactive script to create medialog posts for books/movies using fzf (requires jq and fzf)

### Media Scripts
- `scripts/update-films.sh` - Updates film data from Letterboxd export
  - Automatic mode: Downloads export using cookies (requires sqlite3, unzip, curl)
  - Manual mode: Processes pre-downloaded export directory (requires sqlite3)
  - Supports cookies via file or environment variables
- `scripts/letterboxd-parse.sql` - SQL queries for processing Letterboxd CSV exports

## Common Commands

### Development
```bash
# Start Hugo development server
hugo server

# Build the site
hugo build

# Update book data
./scripts/update-books.sh

# Create new content
./scripts/new-note.sh
./scripts/new-photo.sh path/to/photo.jpg
./scripts/new-post.sh
./scripts/new-media.sh  # Interactive selection of books/movies

# Update media data
./scripts/update-books.sh  # Requires HARDCOVER_API_KEY
./scripts/update-films.sh  # Automatic mode (requires cookies)
./scripts/update-films.sh /path/to/extracted/export/  # Manual mode
```

### Dependencies
- Hugo static site generator
- Go (for cover CLI)
- Hardcover API account for book tracking
- sqlite3 (for film data processing)
- jq (for JSON parsing in new-media.sh)
- fzf (for interactive selection in new-media.sh)
- exiftool (for photo EXIF extraction)
- imagemagick (for photo processing)
- unzip (for automatic Letterboxd export download)
- curl (for automatic Letterboxd export download)

## Content Types
The site uses custom Hugo archetypes for:
- `highlight` - Article highlights and commentary
- `note` - Quick personal notes
- `photo` - Photo posts with metadata
- `post` - Standard blog posts

## Configuration
- Theme: `reallylol` (custom theme)
- Language: English (GB)
- Syntax highlighting: Dracula theme
- Pagination: 10 items per page
- Build future posts: enabled
- Unsafe HTML rendering: enabled for content flexibility

## Todo Items (from README)
- Move content images to Cloudflare R2 (in a GitHub workflow?)
- Update new image script to be compatible with Cloudflare images
