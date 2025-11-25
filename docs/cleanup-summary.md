# Cleanup Summary - Unused Templates and Styles

## Date
2025-01-27

## Overview
Comprehensive cleanup of unused templates, shortcodes, partials, and CSS styles from the really.lol Hugo theme.

## Removed Files

### Unused Shortcodes
1. `themes/reallylol/layouts/_shortcodes/articletable.html` - Not used in any content files
2. `themes/reallylol/layouts/_shortcodes/image.html` - Not used in any content files

### Restored Shortcodes (Initially Removed But Actually Used)
1. `themes/reallylol/layouts/_shortcodes/audio.html` - **RESTORED** - Used in post files (e.g., content/post/2020-04-23-bubbles-in-the-street.md)
2. `themes/reallylol/layouts/_shortcodes/photo.html` - **RESTORED** - Used in photo and post files (e.g., content/photo/2021-11-10-paris-autumn.md, content/post/2022-03-12-the-layoff-business.md)

### Unused Partials
1. `themes/reallylol/layouts/_partials/photo.html` - Not referenced in any templates

## Removed CSS Styles

### Unused CSS Classes
1. `.box-card` - Defined but never used in any templates
2. `.single-main__intro` - Defined but never used in any templates
3. `.media-table__cover` and `.media-table__cover-img` - Explicitly marked for removal (old table cover styles)

### Fixed CSS Issues
1. Fixed `pre` styles - Replaced undefined CSS variables (`--c-body`, `--c-bg2`, `--c-heading`) with defined variables (`--color-line`, `--color-background`, `--color-text`)
2. Removed duplicate `img` style definition

## Kept Files (In Use)

### Shortcodes in Use
- `booktable.html` - Used in content/media/_reading.md, _toread.md, _read.md
- `filmtable.html` - Used in content/media/_watched.md, _towatch.md
- `photo.html` - Used in photo and post content files (e.g., content/photo/2021-11-10-paris-autumn.md, content/post/2022-03-12-the-layoff-business.md)
- `audio.html` - Used in post files (e.g., content/post/2020-04-23-bubbles-in-the-street.md)

### All Templates
All layout templates are part of Hugo's standard template hierarchy and are actively used:
- `baseof.html` - Base template
- `index.html` - Homepage
- `section.html` - Section listings
- `single.html` - Single post template
- `404.html` - Error page
- `taxonomy.html` - Taxonomy listing
- `term.html` - Term page
- Section-specific templates (highlight, note, photo, media, links)
- `plain.html` - Plain page template
- `rss.xml` - RSS feed

### All Partials
All remaining partials are actively used:
- `head.html` - Page head
- `site-header.html` - Site header
- `footer.html` - Site footer
- `pagination.html` - Pagination controls
- `multi-preview.html` - Multi-preview component
- `filter-preview-content.html` - Content filtering
- `media-nav.html` - Media navigation
- `see-also.html` - Related content
- `tag-pretty-name.html` - Tag name formatting
- Icon partials (calendar, capture, location, paperclip, pen, speech, tag)

## Impact
- Reduced theme size by removing 2 unused template files (audio and photo shortcodes were restored)
- Cleaned up CSS by removing ~50 lines of unused styles
- Fixed CSS variable issues in `pre` styles
- Note: `audio.html` and `photo.html` shortcodes were initially removed but restored after discovering they're used in content files
