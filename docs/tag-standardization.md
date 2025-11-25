# Tag Display Standardization

## Summary
Standardized tag display across the site for consistency. All tag lists now use a simple format: lowercase, hashtag, no frills.

## Changes Made

### 1. Tag Pretty Names System
- Created `/data/tag-names.json` to map tag slugs to human-readable "pretty names"
- Created `/themes/reallylol/layouts/_partials/tag-pretty-name.html` helper partial
- Pretty names are used on tag pages (term.html and taxonomy.html) where tags appear as titles
- If a tag doesn't have a mapping, it falls back to title-cased version

### 2. Standardized Tag List Display
All tag lists now display as: `#lowercase-tag-name` (lowercase, hashtag, no frills)

Updated templates:
- `layouts/_partials/multi-preview.html` - Blog list and highlight list
- `layouts/single.html` - Post single view
- `layouts/photo/single.html` - Photo single view
- `layouts/highlight/single.html` - Highlight single view

### 3. Tag Page Titles
- `layouts/term.html` - Tag archive pages now use pretty names
- `layouts/taxonomy.html` - Tag list page now uses pretty names

### 4. Cleanup
- Removed unused `tag-pill` CSS styles
- Removed unused `single-tags.html` partial
- Removed unused `.blog-item__tags svg` CSS rule

## Tag Pretty Names Mapping

The mapping file is located at `/data/tag-names.json`. Currently includes:
- `watchedmovie` → "Watched Movies"
- `medialog` → "Media Log"
- `toread` → "To Read"
- `reading` → "Reading"
- `read` → "Read"
- `towatch` → "To Watch"
- `watched` → "Watched"

Additional mappings can be added to this file as needed.

## Usage

To add a new tag pretty name mapping, edit `/data/tag-names.json`:

```json
{
  "tag-slug": "Pretty Name"
}
```

The system will automatically use the pretty name on tag pages, and fall back to title-cased version if no mapping exists.
