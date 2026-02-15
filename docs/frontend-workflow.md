# Frontend Development Workflow

When doing visual/CSS/layout work on the blog, use this workflow to see what the site looks like and iterate on changes.

## Prerequisites

- Hugo dev server running on port 1313: `hugo server -D --port 1313`
- Playwright browsers installed: `bun run playwright install`

## Workflow

1. **Make CSS/HTML/template changes** in `themes/reallylol/`
2. **Capture screenshots**:
   ```bash
   bun run screenshot        # Desktop only (fast)
   bun run screenshot:mobile # Mobile only
   bun run screenshot:all    # Both viewports
   ```
3. **View screenshots** in `tests/screenshots/`
4. **Iterate** — repeat until the result looks right

## Screenshot Inventory

12 pages × 2 viewports (desktop Chrome + mobile Safari):

| Page | File pattern |
|------|-------------|
| Homepage | `homepage-{desktop,mobile}.png` |
| Notes section | `notes-section-{desktop,mobile}.png` |
| Photos section | `photos-section-{desktop,mobile}.png` |
| Posts section | `posts-section-{desktop,mobile}.png` |
| Highlights section | `highlights-section-{desktop,mobile}.png` |
| About | `about-{desktop,mobile}.png` |
| Books | `media-books-{desktop,mobile}.png` |
| Films | `media-films-{desktop,mobile}.png` |
| Single note | `single-note-{desktop,mobile}.png` |
| Single post | `single-post-{desktop,mobile}.png` |
| Single photo | `single-photo-{desktop,mobile}.png` |
| Single highlight | `single-highlight-{desktop,mobile}.png` |

## Interactive Inspection

For targeted inspection using the playwright-cli skill:

```bash
playwright-cli open http://localhost:1313/     # Open browser
playwright-cli goto http://localhost:1313/note/ # Navigate
playwright-cli snapshot                         # View DOM tree
playwright-cli screenshot                       # Viewport screenshot
playwright-cli resize 375 812                   # Test at specific viewport
playwright-cli close                            # Clean up
```

## Key File Locations

- **CSS**: `themes/reallylol/static/css/` (8 modular files with `@layer` cascade)
- **Templates**: `themes/reallylol/layouts/`
- **Screenshot output**: `tests/screenshots/` (gitignored)
- **Screenshot spec**: `tests/dev-screenshots.spec.ts`

## Regression Tests

After making changes, run the full test suite:

```bash
bun run test          # All tests including visual regression
bun run test:headed   # Watch tests run in real browser
```
