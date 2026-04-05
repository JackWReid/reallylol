# Site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete visual and structural redesign of really.lol - new typography (Fraunces + IBM Plex), Deep Shelf colour palette, section-specific personalities, flattened navigation, "load more" pagination, and consolidated content sections.

**Architecture:** This is a frontend-only redesign. All changes are in `site/src/`. The content model, CMS API, loaders, and build pipeline remain unchanged. We replace the CSS variable system, update layouts/components, and rewrite page templates to match the new design. Preact islands are updated for "load more" instead of page-based pagination.

**Tech Stack:** Astro 5, Preact, CSS custom properties, Google Fonts (Fraunces, IBM Plex Sans, IBM Plex Mono), Cloudflare Pages

**Design spec:** `docs/superpowers/specs/2026-04-05-site-redesign-design.md`

---

## File Structure

### Files to create
- `site/src/components/LoadMore.tsx` - Preact "load more" island (replaces PaginatedList pagination)
- `site/src/components/LibraryTimeline.tsx` - Preact island for books/films timeline view
- `site/src/components/LinksList.tsx` - Preact island for consolidated links section
- `site/src/components/PhotoGrid.tsx` - Preact island for masonry photo grid with load more
- `site/src/components/HomeFeed.tsx` - Preact island for homepage mixed feed with load more
- `site/src/pages/writing/index.astro` - New writing list page (replaces /post/)
- `site/src/pages/writing/[slug].astro` - New writing detail page
- `site/src/pages/notes/index.astro` - New notes page
- `site/src/pages/notes/[slug].astro` - New note detail page
- `site/src/pages/photos/index.astro` - New photos gallery page
- `site/src/pages/library/index.astro` - New unified library page (books + films)
- `site/src/pages/links/index.astro` - New consolidated links page
- `site/src/styles/_variables-new.css` - New design tokens (renamed to _variables.css at end)

### Files to modify
- `site/src/layouts/Base.astro` - Add Google Fonts, update meta, section-aware body classes
- `site/src/components/SiteHeader.astro` - New flat nav with updated links and active state
- `site/src/components/Footer.astro` - Remove random photo, simplify, adapt to section backgrounds
- `site/src/pages/index.astro` - Complete rewrite as mixed feed
- `site/src/pages/index.xml.ts` - Update to use new route structure
- `site/src/content/config.ts` - No changes needed (content model unchanged)
- `site/src/styles/style.css` - Update imports
- `site/src/styles/_reset.css` - Minor updates
- `site/src/styles/_base.css` - Rewrite for new typography
- `site/src/styles/_layout.css` - Rewrite for new nav/footer/sections
- `site/src/styles/_components.css` - Rewrite for new components
- `site/src/styles/_specials.css` - Rewrite for notes/photos dark sections
- `site/src/styles/_utilities.css` - Update for load-more pattern
- `site/src/lib/cms-data.ts` - Add `getAllContent()` function for homepage feed

### Files to delete (after new pages are working)
- `site/src/pages/post/` (entire directory)
- `site/src/pages/note/` (entire directory)
- `site/src/pages/photo/` (entire directory)
- `site/src/pages/highlight/` (entire directory)
- `site/src/components/Pagination.astro`
- `site/src/components/SubNav.astro`
- `site/src/components/PaginatedList.tsx`
- `site/src/components/PreviewCard.astro`

---

## Task 1: Design Tokens and Typography

Replace the CSS variable system with the new Deep Shelf palette and Fraunces + IBM Plex type stack.

**Files:**
- Modify: `site/src/layouts/Base.astro:22-41` (head section)
- Modify: `site/src/styles/_variables.css`
- Modify: `site/src/styles/_reset.css`
- Modify: `site/src/styles/_base.css`

- [ ] **Step 1: Add Google Fonts to Base layout**

In `site/src/layouts/Base.astro`, add the font preconnect and stylesheet links inside `<head>`, after the charset meta tag:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
```

Also update the theme-color meta tag:
```html
<meta name="theme-color" content="#2a3a2e" />
```

- [ ] **Step 2: Replace _variables.css with new design tokens**

Replace the entire contents of `site/src/styles/_variables.css`:

```css
:root {
  /* Palette: Deep Shelf */
  --color-bg: #f0eeea;
  --color-text: #2a3a2e;
  --color-text-secondary: #5a6658;
  --color-accent: #7a8a6a;
  --color-border: #d5d2ca;
  --color-border-light: #e8e5de;

  /* Section: Notes (dark green) */
  --color-notes-bg: #2a3a2e;
  --color-notes-text: #e8e4dc;
  --color-notes-accent: #7a8a6a;
  --color-notes-border: #3a4a3e;

  /* Section: Photos (near-black) */
  --color-photos-bg: #1a1a18;
  --color-photos-text: #e8e4dc;
  --color-photos-accent: #777;

  /* Typography */
  --font-display: 'Fraunces', Georgia, serif;
  --font-body: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'IBM Plex Mono', 'SF Mono', Consolas, monospace;

  /* Type scale */
  --text-xs: 0.625rem;    /* 10px - dates, tags */
  --text-sm: 0.6875rem;   /* 11px - meta labels, nav */
  --text-base: 0.875rem;  /* 14px - body, UI */
  --text-md: 0.9375rem;   /* 15px - reading body */
  --text-lg: 1rem;        /* 16px - list titles */
  --text-xl: 1.125rem;    /* 18px - feed titles */
  --text-2xl: 1.375rem;   /* 22px - note text */
  --text-3xl: 1.625rem;   /* 26px - writing headlines */
  --text-4xl: 1.875rem;   /* 30px - featured headline */
  --text-5xl: 3rem;       /* 48px - year markers */

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;

  /* Dimensions */
  --width-content: 680px;
  --width-content-wide: 1000px;
  --width-notes: 600px;

  /* Breakpoints (for reference - used in media queries) */
  /* sm: 600px, md: 800px, lg: 1000px */

  /* Fraunces variation settings */
  --fraunces-wonk: 'WONK' 1;

  font-family: var(--font-body);
  background: var(--color-bg);
  color: var(--color-text);
}
```

- [ ] **Step 3: Update _reset.css**

Replace the contents of `site/src/styles/_reset.css`:

```css
@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    scrollbar-gutter: stable;
    -webkit-text-size-adjust: 100%;
  }

  body {
    margin: 0;
    min-height: 100dvh;
    line-height: 1.5;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  h1, h2, h3, h4, h5, h6 {
    overflow-wrap: break-word;
    font-weight: 400;
  }

  p {
    overflow-wrap: break-word;
  }

  a {
    color: inherit;
  }
}
```

- [ ] **Step 4: Update _base.css for new typography**

Replace the contents of `site/src/styles/_base.css`:

```css
@layer base {
  body {
    font-family: var(--font-body);
    font-size: var(--text-base);
    color: var(--color-text);
    background: var(--color-bg);
  }

  h1, h2, h3 {
    font-family: var(--font-display);
    font-variation-settings: var(--fraunces-wonk);
    line-height: 1.2;
  }

  a {
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }

  a:hover {
    color: var(--color-accent);
  }

  blockquote {
    font-family: var(--font-display);
    font-style: italic;
    font-variation-settings: var(--fraunces-wonk);
    font-size: var(--text-xl);
    line-height: 1.5;
    color: var(--color-text-secondary);
    border-left: 2px solid var(--color-border);
    padding-left: var(--space-lg);
    margin: var(--space-xl) 0;
  }

  hr {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: var(--space-xl) 0;
  }

  figure {
    margin: var(--space-xl) 0;
  }

  figcaption {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    margin-top: var(--space-sm);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-accent);
  }

  td, th {
    padding: var(--space-sm) var(--space-md) var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  code {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }

  pre {
    padding: var(--space-lg);
    overflow-x: auto;
    border-radius: 2px;
  }
}
```

- [ ] **Step 5: Verify fonts load correctly**

Run: `cd /Users/jackreid/Developer/reallylol && bun run dev:site`

Open http://localhost:4321 and confirm:
- Fraunces loads (check any heading)
- IBM Plex Sans loads (check body text)
- IBM Plex Mono loads (check any date/tag)
- Background is `#f0eeea` (warm grey)
- Text is `#2a3a2e` (dark forest green)

Note: The site will look broken at this point because layout/component CSS hasn't been updated yet. That's expected.

- [ ] **Step 6: Commit**

```bash
git add site/src/layouts/Base.astro site/src/styles/_variables.css site/src/styles/_reset.css site/src/styles/_base.css
git commit -m "feat(redesign): replace design tokens with Deep Shelf palette and Fraunces + IBM Plex type system"
```

---

## Task 2: Navigation and Layout Shell

New flat navigation bar and simplified footer. The structural shell everything else lives inside.

**Files:**
- Modify: `site/src/components/SiteHeader.astro`
- Modify: `site/src/components/Footer.astro`
- Modify: `site/src/styles/_layout.css`
- Modify: `site/src/layouts/Base.astro:42-49` (body classes)

- [ ] **Step 1: Rewrite SiteHeader.astro**

Replace the entire contents of `site/src/components/SiteHeader.astro`:

```astro
---
const pathname = Astro.url.pathname;

const navItems = [
  { label: "Writing", href: "/writing/" },
  { label: "Notes", href: "/notes/" },
  { label: "Photos", href: "/photos/" },
  { label: "Library", href: "/library/" },
  { label: "Links", href: "/links/" },
];

function isActive(href: string): boolean {
  return pathname.startsWith(href);
}
---
<header class="site-header">
  <a href="/" class="site-header__logo">really.lol</a>
  <nav class="site-header__nav" aria-label="Main navigation">
    {navItems.map((item) => (
      <a
        href={item.href}
        class:list={["site-header__link", { "site-header__link--active": isActive(item.href) }]}
      >
        {item.label}
      </a>
    ))}
  </nav>
</header>
```

- [ ] **Step 2: Rewrite Footer.astro**

Replace the entire contents of `site/src/components/Footer.astro`:

```astro
---
const now = new Date();
const lastUpdated = now.toLocaleString("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  day: "numeric",
  month: "long",
  year: "numeric",
});
---
<footer class="site-footer">
  <div class="site-footer__links">
    <a rel="me" href="https://social.lol/@nice">@nice</a>
    <a href="/now">/now</a>
    <a href="/index.xml">RSS</a>
  </div>
  <div class="site-footer__meta">
    Fresh as of {lastUpdated}
  </div>
</footer>
```

- [ ] **Step 3: Update Base.astro body classes for section-aware styling**

In `site/src/layouts/Base.astro`, update the body tag and surrounding logic. The `section` prop now controls background colour switching for notes/photos:

```astro
<body class:list={[section && `section-${section}`]}>
```

- [ ] **Step 4: Rewrite _layout.css**

Replace the entire contents of `site/src/styles/_layout.css`:

```css
@layer layout {
  /* Header */
  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-md) var(--space-xl);
    border-bottom: 1.5px solid var(--color-text);
    max-width: var(--width-content-wide);
    margin: 0 auto;
  }

  .site-header__logo {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 500;
    font-variation-settings: var(--fraunces-wonk);
    text-decoration: none;
  }

  .site-header__nav {
    display: flex;
    gap: var(--space-lg);
    flex-wrap: wrap;
  }

  .site-header__link {
    font-size: var(--text-sm);
    text-decoration: none;
    color: var(--color-accent);
    letter-spacing: 0.3px;
  }

  .site-header__link:hover {
    color: var(--color-text);
  }

  .site-header__link--active {
    color: var(--color-text);
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  /* Footer */
  .site-footer {
    max-width: var(--width-content-wide);
    margin: 0 auto;
    padding: var(--space-2xl) var(--space-xl) var(--space-xl);
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: var(--text-sm);
    color: var(--color-accent);
  }

  .site-footer__links {
    display: flex;
    gap: var(--space-lg);
  }

  .site-footer__links a {
    text-decoration: none;
  }

  .site-footer__links a:hover {
    color: var(--color-text);
  }

  .site-footer__meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
  }

  /* Section backgrounds */
  .section-notes {
    background: var(--color-notes-bg);
    color: var(--color-notes-text);
  }

  .section-notes .site-header {
    border-bottom-color: var(--color-notes-border);
  }

  .section-notes .site-header__logo {
    color: var(--color-notes-text);
  }

  .section-notes .site-header__link {
    color: var(--color-notes-accent);
  }

  .section-notes .site-header__link--active {
    color: var(--color-notes-text);
  }

  .section-notes .site-footer {
    border-top-color: var(--color-notes-border);
    color: var(--color-notes-accent);
  }

  .section-notes .site-footer__links a:hover {
    color: var(--color-notes-text);
  }

  .section-photos {
    background: var(--color-photos-bg);
    color: var(--color-photos-text);
  }

  .section-photos .site-header {
    border-bottom-color: #333;
  }

  .section-photos .site-header__logo {
    color: var(--color-photos-text);
  }

  .section-photos .site-header__link {
    color: var(--color-photos-accent);
  }

  .section-photos .site-header__link--active {
    color: var(--color-photos-text);
  }

  .section-photos .site-footer {
    border-top-color: #333;
    color: var(--color-photos-accent);
  }

  .section-photos .site-footer__links a:hover {
    color: var(--color-photos-text);
  }

  /* Main content wrappers */
  .site-wrapper {
    max-width: var(--width-content-wide);
    margin: 0 auto;
    padding: 0 var(--space-xl);
  }

  /* Mobile */
  @media (max-width: 600px) {
    .site-header {
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-md);
    }

    .site-header__nav {
      gap: var(--space-md);
    }

    .site-footer {
      flex-direction: column;
      gap: var(--space-sm);
      padding: var(--space-xl) var(--space-md);
    }
  }
}
```

- [ ] **Step 5: Verify nav and footer render correctly**

Run the dev server and check:
- Logo "really.lol" in Fraunces on the left
- Five nav links on the right
- Active link is underlined
- Footer shows @nice, /now, RSS on left, timestamp on right
- Mobile: stacks vertically

- [ ] **Step 6: Commit**

```bash
git add site/src/components/SiteHeader.astro site/src/components/Footer.astro site/src/layouts/Base.astro site/src/styles/_layout.css
git commit -m "feat(redesign): flat navigation bar and simplified footer with section-aware backgrounds"
```

---

## Task 3: Homepage Feed

Rewrite the homepage as a mixed chronological feed across all content types.

**Files:**
- Modify: `site/src/lib/cms-data.ts` (add getAllContent)
- Create: `site/src/components/HomeFeed.tsx`
- Modify: `site/src/pages/index.astro`
- Modify: `site/src/styles/_components.css`

- [ ] **Step 1: Add getAllContent to cms-data.ts**

Add this function and interface to `site/src/lib/cms-data.ts`:

```typescript
export interface FeedItem {
  type: "post" | "note" | "photo" | "highlight";
  title: string;
  slug: string;
  date: string;
  excerpt?: string;
  image?: string;
  location?: string;
}

export async function getAllContent(): Promise<FeedItem[]> {
  const res = await fetch(`${CMS_API_URL}/api/content?status=published&limit=200`, {
    headers: { Authorization: `Bearer ${CMS_API_KEY}` },
  });
  if (!res.ok) throw new Error(`CMS getAllContent failed: ${res.status}`);
  const data = await res.json() as { items: Array<{
    type: string;
    slug: string;
    title: string;
    date: string;
    body?: string;
    meta?: Record<string, unknown>;
  }> };
  return data.items
    .map((item) => ({
      type: item.type as FeedItem["type"],
      title: item.title,
      slug: item.slug,
      date: item.date,
      excerpt: item.body?.slice(0, 200)?.replace(/[#*_\[\]]/g, "").trim(),
      image: item.type === "photo" ? (item.meta?.image as string) : undefined,
      location: item.type === "photo" ? (item.meta?.location as string) : undefined,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
```

- [ ] **Step 2: Create HomeFeed.tsx Preact island**

Create `site/src/components/HomeFeed.tsx`:

```tsx
import { useState } from "preact/hooks";
import type { FeedItem } from "../lib/cms-data";

const PER_PAGE = 24;

function typeLabel(type: string): string {
  if (type === "post") return "journal";
  return type;
}

function typeUrl(item: FeedItem): string {
  if (item.type === "post") return `/writing/${item.slug}/`;
  if (item.type === "note") return `/notes/${item.slug}/`;
  if (item.type === "photo") return `/photos/${item.slug}/`;
  if (item.type === "highlight") return `/links/`;
  return "/";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HomeFeed({ items }: { items: FeedItem[] }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = items.slice(0, shown);
  const hasMore = shown < items.length;

  const featured = visible[0];
  const rest = visible.slice(1);

  return (
    <div class="home-feed">
      {featured && (
        <a href={typeUrl(featured)} class="feed-featured">
          <div class="feed-featured__text">
            <span class="feed-meta">
              {typeLabel(featured.type)} · {formatDate(featured.date)}
            </span>
            <h2 class="feed-featured__title">{featured.title}</h2>
            {featured.excerpt && (
              <p class="feed-featured__excerpt">{featured.excerpt}</p>
            )}
          </div>
        </a>
      )}
      <div class="feed-list">
        {rest.map((item) => (
          <a href={typeUrl(item)} class="feed-item" key={`${item.type}-${item.slug}`}>
            <div class="feed-item__text">
              <span class="feed-item__title">{item.title}</span>
              <span class="feed-meta">
                {typeLabel(item.type)} · {formatDate(item.date)}
              </span>
            </div>
            {item.type === "photo" && item.image && (
              <div class="feed-item__thumb">
                <img
                  src={`https://media.really.lol/${item.image}`}
                  alt=""
                  loading="lazy"
                />
              </div>
            )}
          </a>
        ))}
      </div>
      {hasMore && (
        <div class="load-more">
          <button
            type="button"
            class="load-more__btn"
            onClick={() => setShown((s) => s + PER_PAGE)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rewrite index.astro**

Replace the entire contents of `site/src/pages/index.astro`:

```astro
---
import Base from "../layouts/Base.astro";
import { HomeFeed } from "../components/HomeFeed";
import { getAllContent } from "../lib/cms-data";

const items = await getAllContent();
---

<Base title="really.lol" description="Writing, photos, notes, and things read and watched.">
  <main>
    <HomeFeed items={items} client:load />
  </main>
</Base>
```

- [ ] **Step 4: Add feed styles to _components.css**

Replace the entire contents of `site/src/styles/_components.css`:

```css
@layer components {
  /* Feed meta (shared) */
  .feed-meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
  }

  /* Homepage featured item */
  .feed-featured {
    display: block;
    padding: var(--space-2xl) 0 var(--space-xl);
    border-bottom: 1px solid var(--color-border);
    text-decoration: none;
    color: inherit;
  }

  .feed-featured__title {
    font-family: var(--font-display);
    font-size: var(--text-4xl);
    font-weight: 400;
    font-variation-settings: var(--fraunces-wonk);
    line-height: 1.18;
    margin: var(--space-sm) 0 var(--space-md);
    max-width: 600px;
  }

  .feed-featured__excerpt {
    font-size: var(--text-base);
    line-height: 1.65;
    color: var(--color-text-secondary);
    max-width: 560px;
  }

  /* Feed list items */
  .feed-list {
    display: flex;
    flex-direction: column;
  }

  .feed-item {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    padding: var(--space-lg) 0;
    border-bottom: 1px solid var(--color-border);
    text-decoration: none;
    color: inherit;
    gap: var(--space-md);
  }

  .feed-item__text {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .feed-item__title {
    font-family: var(--font-display);
    font-size: var(--text-xl);
    font-variation-settings: var(--fraunces-wonk);
    line-height: 1.3;
  }

  .feed-item__thumb {
    width: 48px;
    height: 48px;
    border-radius: 2px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .feed-item__thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Load more (shared across all sections) */
  .load-more {
    padding: var(--space-xl) 0;
    text-align: center;
  }

  .load-more__btn {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--color-accent);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .load-more__btn:hover {
    color: var(--color-text);
  }

  /* Section tabs (Library, Links) */
  .section-tabs {
    display: flex;
    gap: var(--space-xl);
    padding: var(--space-md) 0 0;
    border-bottom: 1px solid var(--color-border);
  }

  .section-tabs a {
    font-size: var(--text-sm);
    color: var(--color-accent);
    text-decoration: none;
    padding-bottom: var(--space-md);
  }

  .section-tabs a.active {
    color: var(--color-text);
    font-weight: 500;
    border-bottom: 2px solid var(--color-text);
  }

  .section-tabs .tab-divider {
    border-left: 1px solid var(--color-border);
    margin: 0 var(--space-sm);
  }
}
```

- [ ] **Step 5: Verify homepage renders**

Run dev server. Homepage should show:
- Featured item at top with large Fraunces headline
- List of feed items below with type labels
- "Load more" button at bottom
- Photos show small thumbnails

- [ ] **Step 6: Commit**

```bash
git add site/src/lib/cms-data.ts site/src/components/HomeFeed.tsx site/src/pages/index.astro site/src/styles/_components.css
git commit -m "feat(redesign): homepage as mixed chronological feed with load more"
```

---

## Task 4: Writing Section

New writing list and detail pages, replacing /post/.

**Files:**
- Create: `site/src/pages/writing/index.astro`
- Create: `site/src/pages/writing/[slug].astro`

- [ ] **Step 1: Create writing list page**

Create `site/src/pages/writing/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import { generateSummary } from "../../lib/summary";
import { tagToSlug } from "../../lib/tags";

const posts = await getCollection("post");
const sorted = posts.sort(
  (a, b) => b.data.date.getTime() - a.data.date.getTime()
);

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
---

<Base title="Writing" section="writing">
  <main class="writing-list">
    {sorted.map((post) => (
      <article class="writing-item">
        <div class="writing-item__meta">
          <span>{formatDate(post.data.date)}</span>
          {post.data.tags?.map((tag: string) => (
            <>
              <span class="writing-item__dot">·</span>
              <a href={`/tags/${tagToSlug(tag)}/`}>#{tag}</a>
            </>
          ))}
        </div>
        <h2 class="writing-item__title">
          <a href={`/writing/${post.id}/`}>{post.data.title}</a>
        </h2>
        <p class="writing-item__excerpt">
          {generateSummary(post.body ?? "")}
        </p>
      </article>
    ))}
  </main>
</Base>
```

- [ ] **Step 2: Create writing detail page**

Create `site/src/pages/writing/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import Base from "../../layouts/Base.astro";
import { tagToSlug } from "../../lib/tags";

export async function getStaticPaths() {
  const posts = await getCollection("post");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const wordCount = (post.body ?? "").split(/\s+/).length;
const readTime = Math.max(1, Math.round(wordCount / 250));
---

<Base title={post.data.title} section="writing">
  <main class="writing-single">
    <div class="writing-single__meta">
      {formatDate(post.data.date)} · {readTime} min read
    </div>
    <h1 class="writing-single__title">{post.data.title}</h1>
    <div class="writing-single__body">
      <Content />
    </div>
    {post.data.tags && post.data.tags.length > 0 && (
      <div class="writing-single__tags">
        {post.data.tags.map((tag: string) => (
          <a href={`/tags/${tagToSlug(tag)}/`}>#{tag}</a>
        ))}
      </div>
    )}
  </main>
</Base>
```

- [ ] **Step 3: Add writing styles**

Append to `site/src/styles/_components.css`, inside the `@layer components` block:

```css
  /* Writing list */
  .writing-list {
    max-width: var(--width-content);
    padding: var(--space-2xl) 0;
  }

  .writing-item {
    padding-bottom: var(--space-2xl);
    margin-bottom: var(--space-2xl);
    border-bottom: 1px solid var(--color-border);
  }

  .writing-item:last-child {
    border-bottom: none;
  }

  .writing-item__meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .writing-item__meta a {
    text-decoration: none;
  }

  .writing-item__dot {
    opacity: 0.5;
  }

  .writing-item__title {
    font-family: var(--font-display);
    font-size: var(--text-3xl);
    font-weight: 400;
    font-variation-settings: var(--fraunces-wonk);
    line-height: 1.2;
    margin: var(--space-sm) 0 var(--space-md);
  }

  .writing-item__title a {
    text-decoration: none;
  }

  .writing-item__excerpt {
    font-size: var(--text-base);
    line-height: 1.65;
    color: var(--color-text-secondary);
  }

  /* Writing single */
  .writing-single {
    max-width: 640px;
    padding: var(--space-2xl) 0 var(--space-3xl);
  }

  .writing-single__meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
  }

  .writing-single__title {
    font-size: var(--text-4xl);
    margin: var(--space-sm) 0 var(--space-xl);
  }

  .writing-single__body {
    font-size: var(--text-md);
    font-weight: 300;
    line-height: 1.75;
    color: var(--color-text-secondary);
  }

  .writing-single__body p {
    margin-bottom: var(--space-md);
  }

  .writing-single__body strong {
    font-weight: 500;
    color: var(--color-text);
  }

  .writing-single__body img {
    border-radius: 2px;
  }

  .writing-single__tags {
    margin-top: var(--space-xl);
    padding-top: var(--space-md);
    border-top: 1px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    display: flex;
    gap: var(--space-md);
  }

  .writing-single__tags a {
    text-decoration: none;
  }
```

- [ ] **Step 4: Verify writing pages**

Check:
- `/writing/` shows list of posts with dates, tags, headlines, excerpts
- `/writing/[any-slug]/` shows full post with reading time
- Fraunces headlines, Plex Mono meta, Plex Sans body

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/writing/ site/src/styles/_components.css
git commit -m "feat(redesign): writing section with list and detail pages"
```

---

## Task 5: Notes Section (Dark Treatment)

Notes with dark green background and intimate reading feel.

**Files:**
- Create: `site/src/pages/notes/index.astro`
- Create: `site/src/pages/notes/[slug].astro`

- [ ] **Step 1: Create notes list page**

Create `site/src/pages/notes/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";

const notes = await getCollection("note");
const sorted = notes.sort(
  (a, b) => b.data.date.getTime() - a.data.date.getTime()
);

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
---

<Base title="Notes" section="notes">
  <main class="notes-list">
    {sorted.map((note) => (
      <article class="notes-item">
        <a href={`/notes/${note.id}/`} class="notes-item__link">
          <p class="notes-item__text">{note.data.title}</p>
          <time class="notes-item__date">{formatDate(note.data.date)}</time>
        </a>
      </article>
    ))}
  </main>
</Base>
```

- [ ] **Step 2: Create note detail page**

Create `site/src/pages/notes/[slug].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import Base from "../../layouts/Base.astro";

export async function getStaticPaths() {
  const notes = await getCollection("note");
  return notes.map((note) => ({
    params: { slug: note.id },
    props: { note },
  }));
}

const { note } = Astro.props;
const { Content } = await render(note);

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
---

<Base title={note.data.title} section="notes">
  <main class="note-single">
    <div class="note-single__body">
      <Content />
    </div>
    <time class="note-single__date">{formatDate(note.data.date)}</time>
  </main>
</Base>
```

- [ ] **Step 3: Add notes styles**

Append to `site/src/styles/_components.css`, inside the `@layer components` block:

```css
  /* Notes list */
  .notes-list {
    max-width: var(--width-notes);
    margin: 0 auto;
    padding: var(--space-3xl) 0;
  }

  .notes-item {
    padding: var(--space-3xl) 0;
    border-top: 1px solid var(--color-notes-border);
  }

  .notes-item:first-child {
    border-top: none;
    padding-top: 0;
  }

  .notes-item__link {
    text-decoration: none;
    color: inherit;
  }

  .notes-item__text {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 300;
    font-variation-settings: var(--fraunces-wonk);
    line-height: 1.45;
  }

  .notes-item__date {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-notes-accent);
    display: block;
    margin-top: var(--space-md);
  }

  /* Note single */
  .note-single {
    max-width: var(--width-notes);
    margin: 0 auto;
    padding: var(--space-3xl) 0;
  }

  .note-single__body {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    font-weight: 300;
    font-variation-settings: var(--fraunces-wonk);
    line-height: 1.45;
  }

  .note-single__date {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-notes-accent);
    display: block;
    margin-top: var(--space-xl);
  }
```

- [ ] **Step 4: Verify notes section**

Check:
- `/notes/` has dark green background (`#2a3a2e`)
- Nav adapts to light text
- Notes displayed in large Fraunces, plenty of space between entries
- `/notes/[slug]/` renders the note in the same dark treatment

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/notes/ site/src/styles/_components.css
git commit -m "feat(redesign): notes section with dark green background and intimate reading feel"
```

---

## Task 6: Photos Section (Dark Gallery)

Photo gallery with dark background and masonry-style grid.

**Files:**
- Create: `site/src/pages/photos/index.astro`
- Create: `site/src/components/PhotoGrid.tsx`

- [ ] **Step 1: Create PhotoGrid.tsx Preact island**

Create `site/src/components/PhotoGrid.tsx`:

```tsx
import { useState } from "preact/hooks";

const PER_PAGE = 24;

interface Photo {
  id: string;
  title: string;
  date: string;
  image: string;
  location?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function PhotoGrid({ photos, mediaBase }: { photos: Photo[]; mediaBase: string }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = photos.slice(0, shown);
  const hasMore = shown < photos.length;

  return (
    <div class="photo-gallery">
      <div class="photo-grid">
        {visible.map((photo) => (
          <a href={`/photo/${photo.id}/`} class="photo-grid__item" key={photo.id}>
            <img
              src={`${mediaBase}/${photo.image}`}
              alt={photo.title}
              loading="lazy"
            />
            <div class="photo-grid__overlay">
              <span class="photo-grid__title">{photo.title}</span>
              <span class="photo-grid__meta">
                {photo.location && `${photo.location} · `}{formatDate(photo.date)}
              </span>
            </div>
          </a>
        ))}
      </div>
      {hasMore && (
        <div class="load-more">
          <button
            type="button"
            class="load-more__btn load-more__btn--dark"
            onClick={() => setShown((s) => s + PER_PAGE)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create photos index page**

Create `site/src/pages/photos/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import { PhotoGrid } from "../../components/PhotoGrid";

const photos = await getCollection("photo");
const sorted = photos
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .map((p) => ({
    id: p.id,
    title: p.data.title,
    date: p.data.date.toISOString(),
    image: p.data.image,
    location: p.data.location,
  }));

const mediaBase = import.meta.env.PUBLIC_R2_BASE || "https://media.really.lol";
---

<Base title="Photos" section="photos">
  <main>
    <PhotoGrid photos={sorted} mediaBase={mediaBase} client:load />
  </main>
</Base>
```

Note: Individual photo detail pages at `/photo/[slug].astro` remain as-is (server-rendered). They'll need styling updates but the route stays.

- [ ] **Step 3: Add photo grid styles**

Append to `site/src/styles/_components.css`, inside the `@layer components` block:

```css
  /* Photo grid */
  .photo-gallery {
    padding: var(--space-lg) 0;
  }

  .photo-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .photo-grid__item {
    position: relative;
    overflow: hidden;
    border-radius: 2px;
    aspect-ratio: 1;
  }

  .photo-grid__item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  .photo-grid__item:hover img {
    transform: scale(1.03);
  }

  .photo-grid__overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    padding: var(--space-lg) var(--space-md) var(--space-md);
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .photo-grid__item:hover .photo-grid__overlay {
    opacity: 1;
  }

  .photo-grid__title {
    font-family: var(--font-display);
    font-size: 0.8125rem;
    font-variation-settings: var(--fraunces-wonk);
    color: #fff;
  }

  .photo-grid__meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: #aaa;
  }

  .load-more__btn--dark {
    color: var(--color-photos-accent);
  }

  .load-more__btn--dark:hover {
    color: var(--color-photos-text);
  }

  @media (max-width: 800px) {
    .photo-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 480px) {
    .photo-grid {
      grid-template-columns: 1fr;
    }
  }
```

- [ ] **Step 4: Verify photos section**

Check:
- `/photos/` has near-black background
- Grid of photos, 3 columns on desktop, 2 on tablet, 1 on mobile
- Hover reveals title and location with gradient overlay
- "Load more" button works
- Nav adapted to dark background

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/photos/ site/src/components/PhotoGrid.tsx site/src/styles/_components.css
git commit -m "feat(redesign): photos section with dark gallery grid and hover overlays"
```

---

## Task 7: Library Section (Books + Films Timeline)

Unified library page with timeline view, no cover images.

**Files:**
- Create: `site/src/components/LibraryTimeline.tsx`
- Create: `site/src/pages/library/index.astro`

- [ ] **Step 1: Create LibraryTimeline.tsx Preact island**

Create `site/src/components/LibraryTimeline.tsx`:

```tsx
import { useState } from "preact/hooks";

interface TimelineItem {
  title: string;
  creator: string;
  date: string;
  year?: string; // release year for films
}

interface MonthGroup {
  label: string;
  count: number;
  items: TimelineItem[];
}

interface YearGroup {
  year: number;
  months: MonthGroup[];
}

function groupByTimeline(items: TimelineItem[]): YearGroup[] {
  const years = new Map<number, Map<string, TimelineItem[]>>();

  for (const item of items) {
    const d = new Date(item.date);
    const y = d.getFullYear();
    const m = d.toLocaleDateString("en-GB", { month: "long" });

    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(item);
  }

  return Array.from(years.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries()).map(([label, items]) => ({
        label,
        count: items.length,
        items,
      })),
    }));
}

type Tab = "books-read" | "books-reading" | "books-toread" | "films-watched" | "films-towatch";

interface LibraryData {
  booksRead: TimelineItem[];
  booksReading: TimelineItem[];
  booksToRead: TimelineItem[];
  filmsWatched: TimelineItem[];
  filmsToWatch: TimelineItem[];
  bookCount: number;
  authorCount: number;
  filmCount: number;
}

export function LibraryTimeline({ data }: { data: LibraryData }) {
  const [tab, setTab] = useState<Tab>("books-read");

  const tabData: Record<Tab, TimelineItem[]> = {
    "books-read": data.booksRead,
    "books-reading": data.booksReading,
    "books-toread": data.booksToRead,
    "films-watched": data.filmsWatched,
    "films-towatch": data.filmsToWatch,
  };

  const items = tabData[tab];
  const groups = groupByTimeline(items);
  const isBooks = tab.startsWith("books");

  return (
    <div class="library">
      <div class="section-tabs">
        <a
          href="#"
          class={tab === "books-read" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("books-read"); }}
        >Read</a>
        <a
          href="#"
          class={tab === "books-reading" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("books-reading"); }}
        >Reading</a>
        <a
          href="#"
          class={tab === "books-toread" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("books-toread"); }}
        >To Read</a>
        <span class="tab-divider" />
        <a
          href="#"
          class={tab === "films-watched" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("films-watched"); }}
        >Watched</a>
        <a
          href="#"
          class={tab === "films-towatch" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("films-towatch"); }}
        >To Watch</a>
      </div>

      <div class="timeline">
        {groups.map((yearGroup) => (
          <div class="timeline__year" key={yearGroup.year}>
            <h2 class="timeline__year-label">{yearGroup.year}</h2>
            {yearGroup.months.map((month) => (
              <div class="timeline__month" key={month.label}>
                <h3 class="timeline__month-label">
                  {month.label} — {month.count} {isBooks ? (month.count === 1 ? "book" : "books") : (month.count === 1 ? "film" : "films")}
                </h3>
                {month.items.map((item, i) => (
                  <div class="timeline__item" key={`${item.title}-${i}`}>
                    <span class="timeline__title">{item.title}</span>
                    <span class="timeline__creator">
                      {item.creator}{item.year ? ` (${item.year})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div class="library__stats">
        {data.bookCount.toLocaleString()} books · {data.authorCount.toLocaleString()} authors · {data.filmCount.toLocaleString()} films
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create library index page**

Create `site/src/pages/library/index.astro`:

```astro
---
import Base from "../../layouts/Base.astro";
import { LibraryTimeline } from "../../components/LibraryTimeline";
import { getBooks, getFilms } from "../../lib/cms-data";

const [booksRead, booksReading, booksToRead, filmsWatched, filmsToWatch] =
  await Promise.all([
    getBooks("read"),
    getBooks("reading"),
    getBooks("toread"),
    getFilms("watched"),
    getFilms("towatch"),
  ]);

function mapBooks(books: Array<{ title: string; author: string; date_updated: string }>) {
  return books.map((b) => ({
    title: b.title,
    creator: b.author,
    date: b.date_updated,
  }));
}

function mapFilms(films: Array<{ name: string; year: string; date_updated: string }>) {
  return films.map((f) => ({
    title: f.name,
    creator: "",
    date: f.date_updated,
    year: f.year,
  }));
}

const uniqueAuthors = new Set(booksRead.map((b: any) => b.author)).size;

const data = {
  booksRead: mapBooks(booksRead as any),
  booksReading: mapBooks(booksReading as any),
  booksToRead: mapBooks(booksToRead as any),
  filmsWatched: mapFilms(filmsWatched as any),
  filmsToWatch: mapFilms(filmsToWatch as any),
  bookCount: (booksRead as any[]).length + (booksReading as any[]).length + (booksToRead as any[]).length,
  authorCount: uniqueAuthors,
  filmCount: (filmsWatched as any[]).length + (filmsToWatch as any[]).length,
};
---

<Base title="Library" section="library">
  <main>
    <LibraryTimeline data={data} client:load />
  </main>
</Base>
```

- [ ] **Step 3: Add timeline styles**

Append to `site/src/styles/_components.css`, inside the `@layer components` block:

```css
  /* Library timeline */
  .timeline {
    padding: var(--space-xl) 0;
  }

  .timeline__year-label {
    font-family: var(--font-display);
    font-size: var(--text-5xl);
    font-weight: 300;
    font-variation-settings: var(--fraunces-wonk);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .timeline__month {
    padding: var(--space-lg) 0 var(--space-sm);
  }

  .timeline__month-label {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--color-accent);
    font-weight: 400;
    margin-bottom: var(--space-sm);
  }

  .timeline__item {
    padding: var(--space-sm) 0;
    border-bottom: 1px solid var(--color-border-light);
    display: flex;
    align-items: baseline;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .timeline__title {
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-variation-settings: var(--fraunces-wonk);
  }

  .timeline__creator {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--color-accent);
  }

  .library__stats {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    text-align: center;
    padding: var(--space-xl) 0;
  }
```

- [ ] **Step 4: Verify library page**

Check:
- `/library/` shows tabs for Read/Reading/To Read | Watched/To Watch
- Switching tabs changes the list
- Timeline grouped by year, then month, with counts
- Books show title (Fraunces) + author (Plex Sans)
- Films show title + release year
- Stats line at bottom

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/library/ site/src/components/LibraryTimeline.tsx site/src/styles/_components.css
git commit -m "feat(redesign): library section with unified books and films timeline view"
```

---

## Task 8: Links Section (Consolidated)

Saved links, highlights, and blogroll in one place.

**Files:**
- Create: `site/src/components/LinksList.tsx`
- Create: `site/src/pages/links/index.astro`

- [ ] **Step 1: Create LinksList.tsx Preact island**

Create `site/src/components/LinksList.tsx`:

```tsx
import { useState } from "preact/hooks";

const PER_PAGE = 24;

interface SavedLink {
  title: string;
  url: string;
  date: string;
  tags?: string[];
}

interface Highlight {
  title: string;
  slug: string;
  date: string;
  link?: string;
  excerpt?: string;
}

interface BlogrollSite {
  title: string;
  url: string;
  description?: string;
}

type Tab = "saved" | "highlights" | "blogroll";

interface LinksData {
  saved: SavedLink[];
  highlights: Highlight[];
  blogroll: BlogrollSite[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function SavedList({ items }: { items: SavedLink[] }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = items.slice(0, shown);

  return (
    <>
      <div class="links-saved">
        {visible.map((link) => (
          <div class="links-saved__item" key={link.url}>
            <div class="links-saved__header">
              <a href={link.url} target="_blank" rel="noopener" class="links-saved__title">
                {link.title}
              </a>
              <span class="links-saved__domain">{getDomain(link.url)}</span>
            </div>
            <div class="links-saved__meta">
              {link.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
              <span class="links-saved__date">{formatDate(link.date)}</span>
            </div>
          </div>
        ))}
      </div>
      {shown < items.length && (
        <div class="load-more">
          <button
            type="button"
            class="load-more__btn"
            onClick={() => setShown((s) => s + PER_PAGE)}
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

function HighlightsList({ items }: { items: Highlight[] }) {
  const [shown, setShown] = useState(PER_PAGE);
  const visible = items.slice(0, shown);

  return (
    <>
      <div class="links-highlights">
        {visible.map((h) => (
          <div class="links-highlights__item" key={h.slug}>
            <div class="links-highlights__title">{h.title}</div>
            {h.excerpt && (
              <blockquote class="links-highlights__quote">{h.excerpt}</blockquote>
            )}
            <div class="links-saved__meta">
              {h.link && <a href={h.link} target="_blank" rel="noopener">{getDomain(h.link)}</a>}
              <span class="links-saved__date">{formatDate(h.date)}</span>
            </div>
          </div>
        ))}
      </div>
      {shown < items.length && (
        <div class="load-more">
          <button
            type="button"
            class="load-more__btn"
            onClick={() => setShown((s) => s + PER_PAGE)}
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

function BlogrollList({ items }: { items: BlogrollSite[] }) {
  return (
    <div class="links-blogroll">
      {items.map((site) => (
        <div class="links-blogroll__item" key={site.url}>
          <a href={site.url} target="_blank" rel="noopener" class="links-blogroll__title">
            {site.title}
          </a>
          {site.description && (
            <span class="links-blogroll__desc">{site.description}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function LinksPage({ data }: { data: LinksData }) {
  const [tab, setTab] = useState<Tab>("saved");

  return (
    <div class="links-page">
      <div class="section-tabs">
        <a
          href="#"
          class={tab === "saved" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("saved"); }}
        >Saved</a>
        <a
          href="#"
          class={tab === "highlights" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("highlights"); }}
        >Highlights</a>
        <a
          href="#"
          class={tab === "blogroll" ? "active" : ""}
          onClick={(e) => { e.preventDefault(); setTab("blogroll"); }}
        >Blogroll</a>
      </div>

      {tab === "saved" && <SavedList items={data.saved} />}
      {tab === "highlights" && <HighlightsList items={data.highlights} />}
      {tab === "blogroll" && <BlogrollList items={data.blogroll} />}
    </div>
  );
}
```

- [ ] **Step 2: Create links index page**

Create `site/src/pages/links/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import { LinksPage } from "../../components/LinksList";
import { getLinks } from "../../lib/cms-data";

const savedLinks = await getLinks();
const saved = (savedLinks as Array<{ title: string; url: string; date: string; tags?: string[] }>)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const highlights = await getCollection("highlight");
const sortedHighlights = highlights
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .map((h) => ({
    title: h.data.title,
    slug: h.id,
    date: h.data.date.toISOString(),
    link: h.data.link,
    excerpt: h.body?.slice(0, 300)?.replace(/[#*_\[\]>]/g, "").trim(),
  }));

// Blogroll: loaded from CMS pages collection
// The blogroll page content will be parsed as structured data
// For now, pass an empty array - will be populated when blogroll data is available
const blogroll: Array<{ title: string; url: string; description?: string }> = [];

const data = {
  saved,
  highlights: sortedHighlights,
  blogroll,
};
---

<Base title="Links" section="links">
  <main>
    <LinksPage data={data} client:load />
  </main>
</Base>
```

- [ ] **Step 3: Add links styles**

Append to `site/src/styles/_components.css`, inside the `@layer components` block:

```css
  /* Links section */
  .links-page {
    max-width: 700px;
  }

  .links-saved__item {
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .links-saved__header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--space-md);
  }

  .links-saved__title {
    font-size: var(--text-base);
    font-weight: 500;
  }

  .links-saved__domain {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    flex-shrink: 0;
    opacity: 0.7;
  }

  .links-saved__meta {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    display: flex;
    gap: var(--space-sm);
    margin-top: 4px;
  }

  .links-saved__meta a {
    text-decoration: none;
  }

  .links-saved__date {
    opacity: 0.5;
  }

  /* Highlights */
  .links-highlights__item {
    padding: var(--space-lg) 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .links-highlights__title {
    font-weight: 500;
    margin-bottom: var(--space-sm);
  }

  .links-highlights__quote {
    font-family: var(--font-display);
    font-style: italic;
    font-variation-settings: var(--fraunces-wonk);
    font-size: var(--text-base);
    line-height: 1.5;
    color: var(--color-text-secondary);
    border-left: 2px solid var(--color-border);
    padding-left: var(--space-md);
    margin: var(--space-sm) 0;
  }

  /* Blogroll */
  .links-blogroll__item {
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .links-blogroll__title {
    font-weight: 500;
  }

  .links-blogroll__desc {
    display: block;
    font-size: var(--text-sm);
    color: var(--color-accent);
    margin-top: 2px;
  }
```

- [ ] **Step 4: Verify links page**

Check:
- `/links/` shows tabs for Saved/Highlights/Blogroll
- Saved links show title + domain + tags + date
- Highlights show title + blockquote excerpt + source
- Dense, scannable layout

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/links/ site/src/components/LinksList.tsx site/src/styles/_components.css
git commit -m "feat(redesign): consolidated links section with saved, highlights, and blogroll tabs"
```

---

## Task 9: Cleanup and Route Migration

Remove old pages, update routes, clean up unused components and styles.

**Files:**
- Delete: `site/src/pages/post/` (directory)
- Delete: `site/src/pages/note/` (directory)
- Delete: `site/src/pages/photo/index.astro` and `site/src/pages/photo/page/`
- Delete: `site/src/pages/highlight/` (directory)
- Delete: `site/src/components/Pagination.astro`
- Delete: `site/src/components/SubNav.astro`
- Delete: `site/src/components/PaginatedList.tsx`
- Delete: `site/src/components/PreviewCard.astro`
- Modify: `site/src/pages/[...path].astro`
- Modify: `site/src/pages/index.xml.ts`
- Modify: `site/src/styles/_specials.css`
- Modify: `site/src/styles/_utilities.css`

- [ ] **Step 1: Delete old page directories**

```bash
rm -rf site/src/pages/post/ site/src/pages/note/ site/src/pages/highlight/
rm site/src/pages/photo/index.astro
rm -rf site/src/pages/photo/page/
```

Keep `site/src/pages/photo/[slug].astro` - it's still used for individual photo SSR pages.

- [ ] **Step 2: Delete old components**

```bash
rm site/src/components/Pagination.astro site/src/components/SubNav.astro site/src/components/PaginatedList.tsx site/src/components/PreviewCard.astro
```

- [ ] **Step 3: Update catch-all page for remaining CMS pages**

The `[...path].astro` catch-all currently handles books/films/links CMS pages and static pages like /now and /uses. Books/films/links are now handled by dedicated pages, so update the catch-all to exclude those and remove the data component imports.

Replace `site/src/pages/[...path].astro`:

```astro
---
import { getCollection, render } from "astro:content";
import Base from "../layouts/Base.astro";

export async function getStaticPaths() {
  const pages = await getCollection("page");
  // Exclude pages that are now handled by dedicated routes
  const excludePrefixes = ["/books", "/films", "/links"];
  return pages
    .filter((p) => p.data.url && p.data.layout !== "redirect")
    .filter((p) => !excludePrefixes.some((prefix) => p.data.url!.startsWith(prefix)))
    .map((page) => ({
      params: { path: page.data.url!.replace(/^\//, "").replace(/\/$/, "") },
      props: { page },
    }));
}

const { page } = Astro.props;
const { Content } = await render(page);
---

<Base title={page.data.title}>
  <main class="page-content">
    <h1>{page.data.title}</h1>
    {page.body && (
      <div class="page-content__body">
        <Content />
      </div>
    )}
  </main>
</Base>
```

- [ ] **Step 4: Update RSS feed for new routes**

Replace `site/src/pages/index.xml.ts`:

```typescript
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";

export async function GET(context: APIContext) {
  const posts = await getCollection("post");
  const notes = await getCollection("note");
  const photos = await getCollection("photo");

  const items = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/writing/${p.id}/`,
      description: p.body?.slice(0, 200) ?? "",
    })),
    ...notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      link: `/notes/${n.id}/`,
    })),
    ...photos.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/photo/${p.id}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "really.lol",
    description: "Writing, photos, notes, and things read and watched.",
    site: context.site!,
    items,
  });
}
```

- [ ] **Step 5: Clean up specials and utilities CSS**

Replace `site/src/styles/_specials.css`:

```css
@layer specials {
  /* Page content (static pages like /now, /uses) */
  .page-content {
    max-width: var(--width-content);
    padding: var(--space-2xl) 0 var(--space-3xl);
  }

  .page-content h1 {
    font-size: var(--text-4xl);
    margin-bottom: var(--space-xl);
  }

  .page-content__body {
    font-size: var(--text-md);
    line-height: 1.75;
    color: var(--color-text-secondary);
  }

  .page-content__body p {
    margin-bottom: var(--space-md);
  }

  .page-content__body a {
    text-decoration-thickness: 1px;
  }
}
```

Replace `site/src/styles/_utilities.css`:

```css
@layer utilities {
  .skip-link {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .skip-link:focus {
    position: fixed;
    top: 0;
    left: 0;
    width: auto;
    height: auto;
    clip: auto;
    padding: var(--space-sm) var(--space-md);
    background: var(--color-text);
    color: var(--color-bg);
    z-index: 100;
    font-size: var(--text-sm);
  }
}
```

- [ ] **Step 6: Verify everything builds**

```bash
cd /Users/jackreid/Developer/reallylol && bun run build:site
```

Fix any build errors. Common issues:
- Broken imports in remaining files referencing deleted components
- Missing route references in tags pages

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(redesign): remove old pages and components, update routes and RSS feed"
```

---

## Task 10: Tags Pages Update

Update the tags index and tag archive pages to use the new design system.

**Files:**
- Modify: `site/src/pages/tags/index.astro`
- Modify: `site/src/pages/tags/[tag]/[...page].astro`

- [ ] **Step 1: Update tags index page**

Replace `site/src/pages/tags/index.astro`:

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import { getPrettyName, tagToSlug } from "../../lib/tags";

const posts = await getCollection("post");
const photos = await getCollection("photo");
const highlights = await getCollection("highlight");

const tagCounts = new Map<string, number>();
for (const item of [...posts, ...photos, ...highlights]) {
  for (const tag of item.data.tags ?? []) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
}

const sortedTags = Array.from(tagCounts.entries())
  .sort((a, b) => b[1] - a[1]);
---

<Base title="Tags">
  <main class="tags-page">
    <h1>Tags</h1>
    <div class="tags-grid">
      {sortedTags.map(([tag, count]) => (
        <a href={`/tags/${tagToSlug(tag)}/`} class="tags-grid__item">
          <span class="tags-grid__name">#{getPrettyName(tag)}</span>
          <span class="tags-grid__count">{count}</span>
        </a>
      ))}
    </div>
  </main>
</Base>
```

- [ ] **Step 2: Update tag archive page**

Replace `site/src/pages/tags/[tag]/[...page].astro`:

```astro
---
import { getCollection } from "astro:content";
import Base from "../../../layouts/Base.astro";
import { getPrettyName, tagToSlug, slugToTag } from "../../../lib/tags";
import { generateSummary } from "../../../lib/summary";

export async function getStaticPaths() {
  const posts = await getCollection("post");
  const photos = await getCollection("photo");
  const highlights = await getCollection("highlight");

  const allTags = new Set<string>();
  for (const item of [...posts, ...photos, ...highlights]) {
    for (const tag of item.data.tags ?? []) {
      allTags.add(tag);
    }
  }

  return Array.from(allTags).map((tag) => {
    const items = [
      ...posts.filter((p) => p.data.tags?.includes(tag)).map((p) => ({
        type: "post" as const,
        title: p.data.title,
        date: p.data.date,
        slug: p.id,
        excerpt: generateSummary(p.body ?? ""),
      })),
      ...photos.filter((p) => p.data.tags?.includes(tag)).map((p) => ({
        type: "photo" as const,
        title: p.data.title,
        date: p.data.date,
        slug: p.id,
        excerpt: undefined,
      })),
      ...highlights.filter((h) => h.data.tags?.includes(tag)).map((h) => ({
        type: "highlight" as const,
        title: h.data.title,
        date: h.data.date,
        slug: h.id,
        excerpt: undefined,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      params: { tag: tagToSlug(tag), page: undefined },
      props: { tag, items },
    };
  });
}

const { tag, items } = Astro.props;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function itemUrl(type: string, slug: string): string {
  if (type === "post") return `/writing/${slug}/`;
  if (type === "photo") return `/photo/${slug}/`;
  return "#";
}
---

<Base title={`#${getPrettyName(tag)}`}>
  <main class="tag-archive">
    <h1>#{getPrettyName(tag)}</h1>
    <p class="tag-archive__count">{items.length} items</p>
    <div class="tag-archive__list">
      {items.map((item) => (
        <a href={itemUrl(item.type, item.slug)} class="feed-item">
          <div class="feed-item__text">
            <span class="feed-item__title">{item.title}</span>
            <span class="feed-meta">
              {item.type} · {formatDate(item.date)}
            </span>
          </div>
        </a>
      ))}
    </div>
  </main>
</Base>
```

- [ ] **Step 3: Add tags styles**

Append to `site/src/styles/_components.css`, inside the `@layer components` block:

```css
  /* Tags page */
  .tags-page {
    max-width: var(--width-content);
    padding: var(--space-2xl) 0;
  }

  .tags-page h1 {
    font-size: var(--text-4xl);
    margin-bottom: var(--space-xl);
  }

  .tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-sm);
  }

  .tags-grid__item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-sm) 0;
    text-decoration: none;
    border-bottom: 1px solid var(--color-border-light);
  }

  .tags-grid__name {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .tags-grid__count {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
  }

  /* Tag archive */
  .tag-archive {
    max-width: var(--width-content);
    padding: var(--space-2xl) 0;
  }

  .tag-archive h1 {
    font-size: var(--text-4xl);
  }

  .tag-archive__count {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-accent);
    margin-bottom: var(--space-xl);
  }
```

- [ ] **Step 4: Verify tags pages**

Check:
- `/tags/` shows all tags in a grid with counts
- `/tags/[tag]/` shows items for that tag in feed-item style
- Links point to new routes (`/writing/` not `/post/`)

- [ ] **Step 5: Commit**

```bash
git add site/src/pages/tags/ site/src/styles/_components.css
git commit -m "feat(redesign): update tags pages with new design and routes"
```

---

## Task 11: Final Polish and Build Verification

Update photo detail page styling, verify full build, check for broken links.

**Files:**
- Modify: `site/src/pages/photo/[slug].astro` (style updates)
- Modify: `site/src/styles/style.css` (verify import order)

- [ ] **Step 1: Update photo detail page styling**

Read and update `site/src/pages/photo/[slug].astro` to use the new CSS classes and dark section treatment. The page should use `section="photos"` in its Base layout call so it gets the dark background.

Verify the existing file's structure, then update the Base layout call to include `section="photos"`.

- [ ] **Step 2: Verify style.css import order**

`site/src/styles/style.css` should import all layers in the correct order:

```css
@import "./_variables.css";
@import "./_reset.css" layer(reset);
@import "./_base.css" layer(base);
@import "./_layout.css" layer(layout);
@import "./_components.css" layer(components);
@import "./_specials.css" layer(specials);
@import "./_utilities.css" layer(utilities);
```

- [ ] **Step 3: Add .superpowers/ to .gitignore**

```bash
echo ".superpowers/" >> /Users/jackreid/Developer/reallylol/.gitignore
```

- [ ] **Step 4: Full build and verify**

```bash
cd /Users/jackreid/Developer/reallylol && bun run build:site
```

Fix any build errors. Then start the dev server and check all pages:
- `/` - Homepage feed
- `/writing/` - Writing list
- `/writing/[any-post]/` - Writing detail
- `/notes/` - Notes (dark green)
- `/notes/[any-note]/` - Note detail (dark green)
- `/photos/` - Photos gallery (dark)
- `/photo/[any-photo]/` - Photo detail
- `/library/` - Library timeline with tabs
- `/links/` - Links with tabs
- `/tags/` - Tags index
- `/now` - Static page
- `/index.xml` - RSS feed

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(redesign): final polish, photo detail styling, build verification"
```
