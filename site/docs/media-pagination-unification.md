Media pagination markup unified with standard pagination

Summary
- Replaced custom `.pagination-controls` markup in media shortcodes with the same `nav.pagination` structure used by the standard server-side pagination.
- Updated `themes/reallylol/static/js/media-pagination.js` to render Back/Next as `<a>` or `<span>` per page state to match server output exactly and to wire up client-side navigation.
- Adjusted the info text to the format used by templates ("X of Y").

Files changed
- `themes/reallylol/layouts/_shortcodes/booktable.html`: emit `nav.pagination` with Back/Next wrappers and `page-count` span.
- `themes/reallylol/layouts/_shortcodes/filmtable.html`: same as above for films.
- `themes/reallylol/static/js/media-pagination.js`:
  - Swap prev/next between `<span>` (disabled) and `<a href="#">` (enabled) and attach click handlers.
  - Keep URL param `page` in sync and scroll to top on navigation.
  - Update popstate handling to rebuild controls with matching markup.

Notes
- Existing CSS for `.pagination` now styles media pagination consistently with posts.
- Legacy `.pagination-controls*` styles remain unused but harmless; can be removed later if desired.

