# Books Reading Page — Design

**Date:** 2026-04-30
**Status:** Approved, ready for implementation plan
**Scope:** Redesign of `/books/reading` only. The `/books/read` and `/books/toread` timeline pages are out of scope.

## Problem

The reading shelf typically holds 0-3 books. The current page reuses the same flat list / count layout as the read and to-read archives, which works for hundreds of items but feels empty and impersonal at this scale. The goal is a glanceable status page — "what is Jack reading right now" — that reads as a current shelf, not a backlog.

## Approach

Glanceable status. The covers are the page. Per-book content is title + author + "since [month] [year]". Covers link out to Hardcover. Empty state is a single sentence; no fallback to other shelves. Existing section tabs at the top stay for navigation continuity with the rest of the library.

## Layout

### Page structure

`site/src/pages/books/reading.astro` keeps the existing `.section-tabs` block (Read · **Reading** · To Read | Watched · To Watch). Below the tabs is one of:

- `.reading-shelf` — a row of book items (1-3 in practice).
- `.reading-shelf__empty` — a single-sentence empty state.

No "Currently Reading" header label, no count. The page no longer renders `.timeline` markup.

### The row

Container: flex row, `gap: 36px`, `flex-wrap: wrap`, items aligned to the start.

Per-item: fixed `width: 140px`, vertical stack of cover → title → author → since-line.

Cover: `<a href={hardcover_url} target="_blank" rel="noopener">` wrapping an `<img>` at `140 × 210` (2:3 aspect ratio). Box shadow `0 6px 18px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.12)` so the books read as physical objects on a shelf. If `hardcover_url` is missing, the anchor is omitted and the cover renders as a plain `<img>`.

Title: `font-family: var(--font-display)`, italic, `font-variation-settings: var(--fraunces-wonk)`, `font-size: var(--text-lg)` (16px), `line-height: 1.25`, `margin-top: 10px`.

Author: `font-family: var(--font-body)`, `font-size: var(--text-sm)` (11px), `color: var(--color-accent)`, `margin-top: 3px`.

Since-line: `font-family: var(--font-mono)`, `font-size: var(--text-xs)` (10px), `text-transform: uppercase`, `letter-spacing: 1.5px`, `color: var(--color-accent)`, `margin-top: 8px`. Format: `SINCE APRIL 2026`.

### Mobile (≤600px)

`.reading-shelf` collapses to a single column. Each item becomes full width with the cover sized up to `max-width: 220px`, `width: 100%`, centred via `margin: 0 auto`. Title, author, and since-line stay left-aligned within each item; the item itself is centred in the column. The intent is one cover per row, generous size, no horizontal scroll.

### Missing covers

When `image_url` is missing or empty in the source data, render `.reading-shelf__placeholder` instead of the `<img>`:

- Same dimensions as a real cover at each breakpoint (`140 × 210` desktop, scales to ~`220 × 330` on mobile via the same `aspect-ratio: 2 / 3`).
- Background: `var(--color-border-light)` with a `1px solid var(--color-border)`.
- Inside: the title in Fraunces italic at `var(--text-base)`, `color: var(--color-text-secondary)`, padded, centred. Looks like an unstamped book spine.
- Same drop shadow as a real cover so the row stays visually even.

The placeholder is chosen at build time based on whether `image_url` is a non-empty string. Runtime fallback (e.g. `onerror` swapping the DOM) is not in scope — if a Hardcover URL ever 404s, a broken image renders until a sync repopulates the URL or the data is corrected. Acceptable given the small number of books on this page and how rarely Hardcover URLs change.

### Empty state

When `books-reading.json` is an empty array:

```
[ section tabs ]

Between books at the moment.
```

Markup: `<p class="reading-shelf__empty">Between books at the moment.</p>`. Style: `font-family: var(--font-body)`, `font-size: var(--text-md)`, `color: var(--color-text-secondary)`, `padding: var(--space-2xl) 0`, no border, left-aligned to match where the row would begin. No fallback to read or to-read.

## Data

No JSON schema changes. The existing fixture `site/src/data/books-reading.json` already has every field needed:

```json
{
  "title": "...",
  "author": "...",
  "date_updated": "YYYY-MM-DD",
  "image_url": "https://assets.hardcover.app/...",
  "hardcover_url": "https://hardcover.app/books/..."
}
```

### Date semantics

`date_updated` is "last time Hardcover updated this record," not strictly "started reading." For a 1-3 book current shelf this is close enough in practice — moving a book to the reading shelf updates the record, so the date typically reflects the start. Worst case it's off by a few weeks if reading progress is logged mid-book. Accepted trade-off vs. adding a manual `date_started` field that would need maintaining.

### Since-line formatting

Computed at build time:

```ts
new Date(date_updated)
  .toLocaleDateString("en-GB", { month: "long", year: "numeric" })
  .toUpperCase();
```

Produces e.g. `APRIL 2026`. Prefixed with `SINCE ` in the markup.

### Sort order

Items render in the order they appear in `books-reading.json` after sorting by `date_updated` descending — most recently added first. (The current page sorts by title; this changes to date for current-shelf semantics.)

## CSS

New BEM block added to `site/src/styles/_components.css`, in the same `@layer components` block, alongside `.timeline` and `.feed-item`. No new design tokens; everything reuses existing variables from `_variables.css`.

Classes:

- `.reading-shelf` — flex row container with wrap and mobile column override.
- `.reading-shelf__item` — fixed-width vertical stack on desktop, full-width centred on mobile.
- `.reading-shelf__cover` — anchor wrapping the `<img>`, holds the shadow and aspect-ratio.
- `.reading-shelf__cover-img` — the image itself, `width: 100%`, `height: auto`, `display: block`.
- `.reading-shelf__placeholder` — fallback for missing/failed images.
- `.reading-shelf__title` — Fraunces italic, wonk on.
- `.reading-shelf__author` — IBM Plex Sans, accent colour.
- `.reading-shelf__since` — IBM Plex Mono, uppercase.
- `.reading-shelf__empty` — single-line empty state.

The existing `.timeline*` classes are left in place — the read and to-read pages still depend on them.

## Files touched

- `site/src/pages/books/reading.astro` — rewrite the body. Keep the `Base` layout, keep the `.section-tabs` block. Replace the `.timeline` markup with either `.reading-shelf` or the empty state. Add a small helper for the since-line and a sort by `date_updated`. Add the `BookRow` interface field for `image_url` and `hardcover_url` (currently typed as just `title/author/date_updated`).
- `site/src/styles/_components.css` — append the `.reading-shelf*` block.

No changes to:

- `site/src/data/books-reading.json` schema
- `cli/` — no library sync changes; existing data already has the needed fields
- Other pages or layouts

## Out of scope

These were considered and explicitly deferred:

- Per-book pages on really.lol (covers link to Hardcover instead).
- Caching cover images in R2. The site uses Hardcover's CDN URLs directly. If those URLs ever rot or rate-limit, that's a separate piece of work.
- Manual `note`, `progress`, or `date_started` fields. The data stays as it comes from the `cover` CLI sync.
- Empty-state fallbacks to recently-finished or up-next books.
- Redesign of `/books/read` or `/books/toread` — those keep their year/month timeline.

## Acceptance

- With 1-3 books in `books-reading.json`, the page renders a horizontal row of covers on desktop with title, author, and since-line under each. Covers click through to Hardcover in a new tab.
- With 0 books, the page renders the section tabs and the single sentence "Between books at the moment."
- A book missing `image_url` renders the placeholder rectangle with its title typeset inside.
- On a 375px-wide viewport, items stack vertically; no horizontal scroll.
- The read and to-read pages are untouched and still render the year/month timeline.
