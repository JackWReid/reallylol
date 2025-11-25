# Pagination Options for Media Index Pages

## Current Situation

The media index pages (`/books/read`, `/books/toread`, `/films/watched`, `/films/towatch`) are currently single pages that use shortcodes (`booktable` and `filmtable`) to display data from JSON files. These pages are very long:

- `data/books/read.json`: ~5,065 items
- `data/books/toread.json`: ~4,514 items  
- `data/films/watched.json`: ~820 items
- `data/films/towatch.json`: ~244 items

Hugo's built-in `.Paginate` function only works with `.Pages` collections (like section templates), not with data files accessed via shortcodes.

## Options

### Option 1: Custom Section Templates with Manual Pagination ⭐ **RECOMMENDED**

**Approach:** Convert the media pages to use section templates that read from data files and implement pagination manually.

**Pros:**
- Uses Hugo's native URL structure (`/books/read/page/2`)
- No JavaScript required
- Server-side rendered
- Works with Hugo's routing system
- Can reuse existing shortcode rendering logic

**Cons:**
- Requires creating custom section templates
- Manual pagination logic (but straightforward)
- Need to restructure content files slightly

**Implementation:**
1. Create section templates: `layouts/books/section.html` and `layouts/films/section.html`
2. These templates read from data files based on the section name
3. Implement pagination logic using URL path segments
4. Use Hugo's `paginatePath` configuration (default: `page`) to match URL structure
5. Generate pagination links manually

**URL Structure:** `/books/read/page/2`, `/films/watched/page/3`, etc.

---

### Option 2: Enhanced Shortcodes with URL Parameters

**Approach:** Modify the shortcodes to accept page parameters and implement pagination within the shortcode.

**Pros:**
- Minimal changes to existing structure
- Keeps current page-based approach

**Cons:**
- Shortcodes have limited access to page context
- URL generation is tricky (shortcodes don't have full `.Site` context)
- Pagination links would need to be generated outside the shortcode
- Less clean separation of concerns

**Implementation:**
1. Modify shortcodes to accept `page` and `perPage` parameters
2. Calculate pagination in the shortcode
3. Generate pagination links in the page template or a partial
4. Use Hugo's URL routing to handle `/books/read/page/2`

**URL Structure:** `/books/read/page/2` (but implementation is more complex)

---

### Option 3: Generate Individual Pages for Each Item

**Approach:** Create individual page files for each book/film, then use Hugo's built-in pagination.

**Pros:**
- Uses Hugo's native pagination system
- Each item could have its own page
- Standard Hugo approach

**Cons:**
- Would require generating thousands of page files
- Significant maintenance overhead
- Data updates would require regenerating pages
- Probably overkill for this use case

**Implementation:**
1. Create a script to generate individual page files from JSON data
2. Use Hugo's standard section pagination
3. Maintain sync between JSON data and page files

**URL Structure:** `/books/read/page/2` (native Hugo)

---

### Option 4: JavaScript-Based Client-Side Pagination

**Approach:** Load all data and paginate on the client side.

**Pros:**
- No server-side changes needed
- Fast navigation between pages

**Cons:**
- **You explicitly said "without resorting to JavaScript"**
- Initial page load would be very large
- Not SEO-friendly
- Doesn't match your requirement

---

## Recommended Solution: Option 1

### Implementation Plan

1. **Create section templates** that:
   - Read data from JSON files based on section/type
   - Parse the current page number from the URL
   - Slice the data array appropriately
   - Render the items using existing shortcode logic
   - Generate pagination links

2. **Restructure content files:**
   - Keep the current `content/media/_read.md` etc. files
   - Or convert to section structure (`content/books/read/_index.md`)
   - Use Hugo's `url` frontmatter to maintain current URLs

3. **Pagination logic:**
   - Use Hugo's `paginatePath` config (default: `page`)
   - Parse page number from `.RelPermalink` or use a custom approach
   - Calculate `startIndex = (pageNumber - 1) * perPage`
   - Slice data: `$data[startIndex:startIndex+perPage]`

4. **Pagination links:**
   - Generate links manually: `/books/read/page/2`, `/books/read/page/3`, etc.
   - Reuse existing `pagination.html` partial or create a custom one

### Example Structure

```
layouts/
  books/
    section.html  # Handles /books/read, /books/toread, /books/reading
  films/
    section.html  # Handles /films/watched, /films/towatch
```

The templates would:
- Detect which data file to use based on the page's `url` or section
- Read the appropriate JSON file
- Implement pagination logic
- Render items using the existing book/film card/table markup

### URL Routing

Hugo's default pagination path is `/page/2/`, but you can configure it via `paginatePath` in `config.toml`. However, since we're doing manual pagination, we'll need to handle the routing ourselves using Hugo's URL frontmatter and template logic.

---

## Next Steps

If you'd like to proceed with Option 1, I can:
1. Create the section templates with pagination logic
2. Update the content structure if needed
3. Test the pagination with your data files
4. Ensure URLs match your desired structure (`/books/read/page/2`)

Would you like me to implement Option 1?
