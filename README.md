# really.lol

A Hugo-based personal blog and book tracking website.

## Dashboards
- [Cloudflare Pages Deployment](https://dash.cloudflare.com/f163765cc814ca4c341357f282e5d166/pages/view/reallylol)

## Dependencies

### Cover CLI
The `bun run cli sync books` command uses the [cover CLI](https://github.com/jackreid/cover) to fetch book data from Hardcover.

#### Installation
```bash
# Install cover CLI (requires Go)
git clone https://github.com/jackreid/cover.git
cd cover
go build -o cover
# Move binary to PATH or use ./cover directly
```

#### Setup
1. Create a Hardcover account at [hardcover.app](https://hardcover.app)
2. Get your API key from account settings
3. Set the environment variable:
   ```bash
   export HARDCOVER_API_KEY="your-api-key-here"
   ```

## Development

### Building the Site
```bash
# Start development server
hugo server -D --port 1313

# Build for production
hugo --minify
```

### Testing

The site has a Playwright test suite covering homepage rendering, navigation, content sections, accessibility, responsive layout, pagination, and visual regression screenshots.

**Dependencies:** [Bun](https://bun.sh/)

```bash
# Install dependencies
bun install

# Install browsers (first time only)
bunx playwright install chromium webkit
```

**Commands:**

```bash
# Run all tests (auto-starts Hugo dev server)
bun run test

# Run with visible browser
bun run test:headed

# Interactive Playwright UI
bun run test:ui

# Regenerate screenshot baselines after intentional visual changes
bun run test:screenshots

# Run CLI unit tests
bun test scripts/
```

**Test files:**

| File | Coverage |
|---|---|
| `tests/homepage.spec.ts` | Title, meta, intro content, reading widget, visual regression |
| `tests/navigation.spec.ts` | Header links, nav routing, footer, random photo box |
| `tests/sections.spec.ts` | Notes/Photos/Posts titles, content lists, sub-navigation, visual regression |
| `tests/accessibility.spec.ts` | Skip-to-content, aria labels, viewport, lang, image alt attributes |
| `tests/responsive.spec.ts` | Mobile (iPhone 13) vs desktop screenshots |
| `tests/pagination.spec.ts` | Pagination controls and page navigation |
| `scripts/lib/__tests__/*.test.ts` | CLI utility unit tests (slugify, frontmatter, dates, JSON) |

### Scripts

All content management scripts are consolidated into a single TypeScript CLI run via Bun.

#### Content Creation

```bash
bun run cli new post              # Create new blog post (opens in vim)
bun run cli new note              # Create new note
bun run cli new photo photo.jpg   # Create new photo post (requires exiftool, imagemagick)
bun run cli new media             # Create new medialog entry (requires fzf)
```

#### Data Sync

```bash
bun run cli sync books            # Sync from Hardcover (requires cover CLI + HARDCOVER_API_KEY)
bun run cli sync films            # Sync from Letterboxd (RSS + HTML scraping)
bun run cli sync links            # Sync from Raindrop.io (requires token)
bun run cli sync photos           # Rebuild random photo pool from content/photo/
bun run cli sync all              # Run books + links + photos
```

#### Utilities

```bash
bun run cli validate              # Validate frontmatter (reads paths from stdin)
bun run cli bundle to-bundle      # Convert flat post to page bundle
bun run cli bundle to-post        # Convert empty bundle to flat post
```

#### Pre-commit Hook

Install the pre-commit hook to validate frontmatter on staged content:

```bash
ln -sf ../../scripts/pre-commit .git/hooks/pre-commit
```

## Content Types
The site uses custom Hugo archetypes for different content types:
- **highlight** - Article highlights and commentary
- **note** - Quick personal notes and thoughts
- **photo** - Photo posts with metadata
- **post** - Standard blog posts

## Configuration
- Theme: `reallylol` (custom theme)
- Language: English (GB)
- Syntax highlighting: Dracula theme
- Pagination: 10 items per page
- Build future posts: enabled

## Todo
- Update `/uses`
