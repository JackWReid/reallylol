# Media Pagination Implementation

## Overview

The media index pages (`/books/read`, `/books/toread`, `/films/watched`, `/films/towatch`) now support pagination with URLs like `/books/read/page/2`, `/films/watched/page/3`, etc.

## Implementation Details

### Section Templates

Custom section templates handle pagination:
- `themes/reallylol/layouts/books/section.html` - Handles all book sections
- `themes/reallylol/layouts/films/section.html` - Handles all film sections

These templates:
1. Detect which data file to use based on the page URL
2. Parse the current page number from the URL path
3. Slice the data array to show only the current page's items (20 per page)
4. Render items using the existing book/film markup
5. Generate pagination navigation links

### Content Structure

Content has been restructured from single pages to section pages:
- `content/books/read/_index.md` (was `content/media/_read.md`)
- `content/books/toread/_index.md` (was `content/media/_toread.md`)
- `content/books/reading/_index.md` (was `content/media/_reading.md`)
- `content/films/watched/_index.md` (was `content/media/_watched.md`)
- `content/films/towatch/_index.md` (was `content/media/_towatch.md`)

### Pagination Page Generation

Since Hugo doesn't automatically generate pagination pages for data-driven content, a script generates them:

```bash
./scripts/generate-media-pagination.sh
```

This script:
- Reads the JSON data files to determine total items
- Calculates the number of pages needed (20 items per page)
- Generates `_index.md` files in `content/books/read/page/2/`, `content/books/read/page/3/`, etc.
- Each generated page has the same content as the base page but with an updated `url` in frontmatter

### Usage

1. **After updating data files**, run the pagination generation script:
   ```bash
   ./scripts/generate-media-pagination.sh
   ```

2. **Build the site** - Hugo will now generate all pagination pages with proper URLs

3. **Pagination navigation** appears automatically when there's more than one page, showing:
   - "Back" link (to previous page or base URL for page 2)
   - Current page number and total pages
   - "Next" link (to next page)

### Configuration

- **Items per page**: 20 (hardcoded in templates and script)
- **Pagination path**: `/page/2`, `/page/3`, etc. (matches Hugo's default)
- **Base URLs**: Maintained via frontmatter `url` field

### URL Structure

- Base pages: `/books/read`, `/films/watched`, etc.
- Paginated pages: `/books/read/page/2`, `/films/watched/page/3`, etc.
- Page 2 links back to base URL (no `/page/1`)

### Notes

- The old `content/media/_*.md` files can be removed (they've been replaced by section pages)
- The shortcodes (`booktable` and `filmtable`) still work but are no longer used by the main media pages
- Pagination is server-side rendered, no JavaScript required
- All pagination pages should be committed to git (they're generated but needed for Hugo builds)
