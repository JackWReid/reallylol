# Photo thumbnail plan

## Observations
- There are ~2.6k photo posts (`content/photo` files) and ~2.6k images under `static/img/photo` totaling ~513 MB.
- Section template (`themes/reallylol/layouts/photo/section.html`) links directly to the original files. The browser downloads full-resolution (>1400px) photos for every thumbnail in the grid, which is heavy for paginated views.

## Hugo image pipeline approach
1. Treat each photo as a page bundle (e.g., move from `content/photo/YYYY-slug.md` to a folder with `index.md` + original image) or relocate originals into `assets/` so they are available to Hugo’s resource pipeline. Static files cannot be processed.
2. Use `.Resources.GetMatch` inside the photo list template and call `.Fit "500x"` (or `.Resize "500x"`) to generate a 500 px wide version for the grid. Store the processed resource path via `.RelPermalink`.
3. Use `.Permalink` to link to the full post, where the hero image can still use a larger rendition (e.g., `.Fit "1400x"`).

## Build-time impact
- Hugo processes images only once per source hash and stores them in `resources/_gen`. After the first build, repeated local builds reuse the cached thumbnails unless the source image changes.
- Resizing 2.6k JPEGs to 500 px typically costs ~40–60 ms per image on a modern laptop (Go’s `imaging` backend). Expect an initial build taking roughly 2–3 minutes CPU time locally.
- CI builds without a `resources/_gen` cache (e.g., Netlify/Cloudflare) would pay that 2–3 minute cost every time unless the cache directory is persisted between builds.

## Repo size considerations
- If each 500 px thumbnail ends up around 60–80 KB (typical for 500 px JPEGs at quality 80), 2.6k files would add 150–200 MB to the repository if we committed them.
- Tracking generated files inflates the repo permanently and makes `git clone` slower; storing them in `resources/_gen` but keeping that directory ignored avoids expanding the repo but shifts the cost to build time.

## Trade-offs
- **Dynamic (preferred):** keep originals only, let Hugo create thumbnails during build, rely on caching. Pros: repo size unchanged; simplified asset management. Cons: CI must cache `resources/_gen` or builds will be minutes longer.
- **Pre-generated & committed:** script a batch resize (ImageMagick or Hugo `--renderToDisk`), commit thumbnails under `static/img/photo/thumbs/`. Pros: negligible build cost, deterministic file set. Cons: +150–200 MB repo, duplicate assets to maintain, risk of drift if originals change.
- **Hybrid:** run Hugo locally once, capture `resources/_gen/images` artifact, upload to Cloudflare Pages/Netlify build cache or store in an object bucket/CDN. Keeps repo slim and avoids per-build processing, but requires configuring caching in CI.

The dynamic Hugo pipeline with cached `resources/_gen` gives the best balance: we only pay the resize cost when adding new photos, repo size stays stable, and we still get lightweight 500 px thumbnails in the grid.

## Implementation notes (assets-based)
- Moved `static/img/photo/` into `assets/img/photo/` and added a symlink back to preserve legacy `/img/photo/...` references while enabling Hugo's image pipeline.
- Updated photo listing, single view, multi-preview, and footer random photo templates to call `resources.Get` and render `.Fit`ted derivatives (500 px for thumbnails, 1400 px for the hero image).
- Adjusted `scripts/new-photo.sh` + documentation so new uploads land in `assets/img/photo/`.
- A full `hugo` build now processes ~5.3k images the first time (~90 s locally) and caches them under `resources/_gen/` for subsequent runs.
