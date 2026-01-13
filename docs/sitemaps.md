Custom sitemaps and styling

What changed
- Fixed Hugo warning by removing invalid `disableKinds = ["sitemap.xml"]` (Hugo’s kind is `sitemap`).
- Added custom output formats so Hugo emits sectional sitemaps at the home level:
  - `sitemap-pages.xml`
  - `sitemap-posts.xml`
  - `sitemap-notes.xml`
- Wired these outputs via `outputs.home` so they build alongside the main `sitemap.xml` index.
- Corrected section filters in the sectional templates (`post`, `note` vs. `posts`, `notes`).
- Added an XSL stylesheet (`static/sitemap.xsl`) and referenced it from each sitemap for human-friendly viewing.

Files
- `config.toml`
  - Removed `disableKinds` entry for sitemap.
  - Added `outputFormats.SITEMAPPAGES|SITEMAPPOSTS|SITEMAPNOTES`.
  - Extended `outputs.home` to include the above.
- `themes/reallylol/layouts/sitemap.xml`: Added XSL reference (index linking to section sitemaps).
- `themes/reallylol/layouts/sitemap-pages.xml`: Added XSL reference.
- `themes/reallylol/layouts/sitemap-posts.xml`: Fixed Section filter, added XSL reference.
- `themes/reallylol/layouts/sitemap-notes.xml`: Fixed Section filter, added XSL reference.
- `static/sitemap.xsl`: Simple table-based view that handles both `<sitemapindex>` and `<urlset>`, with section-aware titles.

Usage
- Build or serve the site and visit:
  - `/sitemap.xml` (index)
  - `/sitemap-pages.xml`
  - `/sitemap-posts.xml`
  - `/sitemap-notes.xml`
  These should render and be styled in browsers; search engines will ignore the stylesheet and read plain XML.

Notes
- If you want different sections in posts/notes sitemaps, adjust the `where .Site.RegularPages "Section" "..."` filters.
- If you later want a single sitemap only, remove the custom output formats and keep `SITEMAP`.
