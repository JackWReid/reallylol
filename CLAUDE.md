# really.lol - Claude AI Assistant Information

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
- `scripts/new-note.sh` - Creates new note posts
- `scripts/new-photo.sh` - Creates new photo posts
- `scripts/new-post.sh` - Creates new blog posts
- `scripts/date-photo.sh` - Handles photo dating
- `scripts/tag-content.sh` - Manages content tagging

### Media Scripts
- `scripts/update-films.sh` - Updates film data
- `scripts/update-films.sql` - SQL queries for film updates

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
./scripts/new-photo.sh
./scripts/new-post.sh
```

### Dependencies
- Hugo static site generator
- Go (for cover CLI)
- Hardcover API account for book tracking

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
