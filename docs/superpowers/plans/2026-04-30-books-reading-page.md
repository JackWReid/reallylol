# Books Reading Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the timeline-style `/books/reading` page with a glanceable "current shelf" — a row of cover images with title, author, and a "since [month] [year]" line, plus a single-sentence empty state.

**Architecture:** Pure static Astro page. Data comes from the existing `site/src/data/books-reading.json` fixture; no schema changes. Sort and date-formatting helpers go in a small `site/src/lib/reading.ts` module so they can be unit-tested under `bun:test`. Layout uses a new `.reading-shelf*` BEM block in `site/src/styles/_components.css`. Covers are external Hardcover CDN URLs; missing covers fall back to a typeset placeholder rendered at build time.

**Tech Stack:** Astro 5, TypeScript, Bun (test runner: `bun:test`), CSS in `@layer components`, design tokens in `_variables.css`.

**Spec:** `docs/superpowers/specs/2026-04-30-books-reading-page-design.md`

---

## File structure

**Create:**
- `site/src/lib/reading.ts` — helpers: `formatSince`, `sortByRecent`, `BookRow` type, `hasCover` predicate.
- `site/src/lib/__tests__/reading.test.ts` — unit tests for the helpers.

**Modify:**
- `site/src/pages/books/reading.astro` — replace the `.timeline` body with `.reading-shelf` markup driven by the new helpers.
- `site/src/styles/_components.css` — append the `.reading-shelf*` block at the bottom of the `@layer components` block (before the closing brace).

**No changes to:**
- `site/src/data/books-reading.json`
- Any CLI code under `cli/`
- Other pages or layouts
- `_variables.css` (no new tokens)

---

## Task 1: Helper module — types and `hasCover`

**Files:**
- Create: `site/src/lib/reading.ts`
- Create: `site/src/lib/__tests__/reading.test.ts`

- [ ] **Step 1: Write the failing test**

Create `site/src/lib/__tests__/reading.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { hasCover } from "../reading";

describe("hasCover", () => {
  test("returns true for a non-empty image_url", () => {
    expect(hasCover({ title: "x", author: "y", date_updated: "2026-01-01", image_url: "https://example.com/c.jpg", hardcover_url: "https://hardcover.app/x" })).toBe(true);
  });

  test("returns false when image_url is an empty string", () => {
    expect(hasCover({ title: "x", author: "y", date_updated: "2026-01-01", image_url: "", hardcover_url: "https://hardcover.app/x" })).toBe(false);
  });

  test("returns false when image_url is missing", () => {
    expect(hasCover({ title: "x", author: "y", date_updated: "2026-01-01", hardcover_url: "https://hardcover.app/x" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test site/src/lib/__tests__/reading.test.ts`
Expected: FAIL — `Cannot find module '../reading'`.

- [ ] **Step 3: Write minimal implementation**

Create `site/src/lib/reading.ts`:

```typescript
export interface BookRow {
  title: string;
  author: string;
  date_updated: string;
  image_url?: string;
  hardcover_url?: string;
}

export function hasCover(book: BookRow): boolean {
  return typeof book.image_url === "string" && book.image_url.length > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test site/src/lib/__tests__/reading.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/reading.ts site/src/lib/__tests__/reading.test.ts
git commit -m "feat(reading): add BookRow type and hasCover predicate"
```

---

## Task 2: Helper — `formatSince`

**Files:**
- Modify: `site/src/lib/reading.ts`
- Modify: `site/src/lib/__tests__/reading.test.ts`

- [ ] **Step 1: Add the failing test**

In `site/src/lib/__tests__/reading.test.ts`, replace the existing import line at the top:

```typescript
import { hasCover } from "../reading";
```

with:

```typescript
import { hasCover, formatSince } from "../reading";
```

Then append these new test cases to the bottom of the file:

```typescript
describe("formatSince", () => {
  test("formats an ISO date string as SINCE [MONTH] [YEAR]", () => {
    expect(formatSince("2026-04-30")).toBe("SINCE APRIL 2026");
  });

  test("uses British English month names (long form)", () => {
    expect(formatSince("2026-01-15")).toBe("SINCE JANUARY 2026");
    expect(formatSince("2025-09-01")).toBe("SINCE SEPTEMBER 2025");
  });

  test("returns an empty string for an invalid date", () => {
    expect(formatSince("not-a-date")).toBe("");
    expect(formatSince("")).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `bun test site/src/lib/__tests__/reading.test.ts`
Expected: FAIL — `formatSince is not a function` or compile error.

- [ ] **Step 3: Implement `formatSince`**

Append to `site/src/lib/reading.ts`:

```typescript
export function formatSince(dateUpdated: string): string {
  const d = new Date(dateUpdated);
  if (Number.isNaN(d.getTime())) return "";
  const formatted = d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  return `SINCE ${formatted.toUpperCase()}`;
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `bun test site/src/lib/__tests__/reading.test.ts`
Expected: PASS — 6 tests total.

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/reading.ts site/src/lib/__tests__/reading.test.ts
git commit -m "feat(reading): add formatSince date helper"
```

---

## Task 3: Helper — `sortByRecent`

**Files:**
- Modify: `site/src/lib/reading.ts`
- Modify: `site/src/lib/__tests__/reading.test.ts`

- [ ] **Step 1: Add the failing test**

In `site/src/lib/__tests__/reading.test.ts`, replace the existing import line at the top:

```typescript
import { hasCover, formatSince } from "../reading";
```

with:

```typescript
import { hasCover, formatSince, sortByRecent } from "../reading";
```

Then append these new test cases to the bottom of the file:

```typescript
describe("sortByRecent", () => {
  test("sorts books by date_updated descending", () => {
    const books = [
      { title: "Old", author: "a", date_updated: "2025-01-01" },
      { title: "New", author: "a", date_updated: "2026-04-15" },
      { title: "Mid", author: "a", date_updated: "2025-09-10" },
    ];
    const sorted = sortByRecent(books);
    expect(sorted.map((b) => b.title)).toEqual(["New", "Mid", "Old"]);
  });

  test("returns a new array without mutating input", () => {
    const books = [
      { title: "A", author: "a", date_updated: "2025-01-01" },
      { title: "B", author: "a", date_updated: "2026-01-01" },
    ];
    const original = [...books];
    sortByRecent(books);
    expect(books).toEqual(original);
  });

  test("returns an empty array unchanged", () => {
    expect(sortByRecent([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `bun test site/src/lib/__tests__/reading.test.ts`
Expected: FAIL — `sortByRecent is not a function`.

- [ ] **Step 3: Implement `sortByRecent`**

Append to `site/src/lib/reading.ts`:

```typescript
export function sortByRecent(books: BookRow[]): BookRow[] {
  return [...books].sort((a, b) => b.date_updated.localeCompare(a.date_updated));
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `bun test site/src/lib/__tests__/reading.test.ts`
Expected: PASS — 9 tests total.

- [ ] **Step 5: Commit**

```bash
git add site/src/lib/reading.ts site/src/lib/__tests__/reading.test.ts
git commit -m "feat(reading): add sortByRecent helper"
```

---

## Task 4: CSS — `.reading-shelf` block

**Files:**
- Modify: `site/src/styles/_components.css`

- [ ] **Step 1: Locate the insertion point**

Open `site/src/styles/_components.css`. Find the closing brace of the `@layer components { ... }` block — it is the very last `}` in the file. The new block must be inserted **immediately before** that closing brace, after the `.pagination__current` rule.

- [ ] **Step 2: Append the `.reading-shelf*` block**

Insert this CSS just before the closing `}` of `@layer components`:

```css
  /* Reading shelf — current-status page for /books/reading */
  .reading-shelf {
    display: flex;
    flex-wrap: wrap;
    gap: 36px;
    padding: var(--space-2xl) 0 var(--space-3xl);
  }

  .reading-shelf__item {
    width: 140px;
    display: flex;
    flex-direction: column;
  }

  .reading-shelf__cover,
  .reading-shelf__placeholder {
    display: block;
    width: 140px;
    aspect-ratio: 2 / 3;
    box-shadow:
      0 6px 18px rgba(0, 0, 0, 0.18),
      0 1px 3px rgba(0, 0, 0, 0.12);
    border-radius: 1px;
    overflow: hidden;
  }

  .reading-shelf__cover-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .reading-shelf__placeholder {
    background: var(--color-border-light);
    border: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-md);
    font-family: var(--font-display);
    font-style: italic;
    font-variation-settings: var(--fraunces-wonk);
    font-size: var(--text-base);
    color: var(--color-text-secondary);
    line-height: 1.25;
  }

  .reading-shelf__title {
    font-family: var(--font-display);
    font-style: italic;
    font-variation-settings: var(--fraunces-wonk);
    font-size: var(--text-lg);
    line-height: 1.25;
    margin-top: 10px;
  }

  .reading-shelf__author {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    color: var(--color-accent);
    margin-top: 3px;
  }

  .reading-shelf__since {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--color-accent);
    margin-top: 8px;
  }

  .reading-shelf__empty {
    font-family: var(--font-body);
    font-size: var(--text-md);
    color: var(--color-text-secondary);
    padding: var(--space-2xl) 0;
  }

  @media (max-width: 600px) {
    .reading-shelf {
      flex-direction: column;
      align-items: center;
      gap: var(--space-2xl);
    }

    .reading-shelf__item {
      width: 100%;
      max-width: 220px;
    }

    .reading-shelf__cover,
    .reading-shelf__placeholder {
      width: 100%;
    }
  }
```

- [ ] **Step 3: Verify Astro builds**

Run: `bun run build`
Expected: build succeeds with no CSS errors. Look for `dist/` to be regenerated. The page itself still renders the old timeline markup at this point — that's fine, it's the next task.

- [ ] **Step 4: Commit**

```bash
git add site/src/styles/_components.css
git commit -m "feat(reading): add reading-shelf CSS block"
```

---

## Task 5: Rewrite `reading.astro` to use the new layout

**Files:**
- Modify: `site/src/pages/books/reading.astro`

- [ ] **Step 1: Replace the file contents**

Overwrite `site/src/pages/books/reading.astro` with:

```astro
---
import Base from "../../layouts/Base.astro";
import booksData from "../../data/books-reading.json";
import { sortByRecent, formatSince, hasCover, type BookRow } from "../../lib/reading";

const books = sortByRecent(booksData as BookRow[]);
---

<Base title="Library" section="library">
  <main>
    <div class="library">
      <div class="section-tabs">
        <a href="/books/read">Read</a>
        <a href="/books/reading" class="active">Reading</a>
        <a href="/books/toread">To Read</a>
        <span class="tab-divider" />
        <a href="/films/watched">Watched</a>
        <a href="/films/towatch">To Watch</a>
      </div>

      {books.length === 0 ? (
        <p class="reading-shelf__empty">Between books at the moment.</p>
      ) : (
        <div class="reading-shelf">
          {books.map((book) => (
            <div class="reading-shelf__item">
              {hasCover(book) ? (
                book.hardcover_url ? (
                  <a
                    class="reading-shelf__cover"
                    href={book.hardcover_url}
                    target="_blank"
                    rel="noopener"
                  >
                    <img
                      class="reading-shelf__cover-img"
                      src={book.image_url}
                      alt={`${book.title} cover`}
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div class="reading-shelf__cover">
                    <img
                      class="reading-shelf__cover-img"
                      src={book.image_url}
                      alt={`${book.title} cover`}
                      loading="lazy"
                    />
                  </div>
                )
              ) : (
                <div class="reading-shelf__placeholder">{book.title}</div>
              )}
              <div class="reading-shelf__title">{book.title}</div>
              <div class="reading-shelf__author">{book.author}</div>
              <div class="reading-shelf__since">{formatSince(book.date_updated)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  </main>
</Base>
```

- [ ] **Step 2: Verify the build succeeds**

Run: `bun run build`
Expected: build succeeds. No TypeScript or Astro errors.

- [ ] **Step 3: Verify the unit tests still pass**

Run: `bun test`
Expected: all tests pass (9 tests in `reading.test.ts` plus the existing project tests).

- [ ] **Step 4: Commit**

```bash
git add site/src/pages/books/reading.astro
git commit -m "feat(reading): rewrite /books/reading as glanceable shelf"
```

---

## Task 6: Visual verification in dev

**Files:** None changed.

This task confirms the page renders correctly across the three states (1+ books, missing cover, empty). It is manual but required — Astro components are not unit-tested in this project.

- [ ] **Step 1: Start the dev server**

Run: `bun run dev`
Expected: Astro reports `Local http://localhost:4321/`. Leave it running.

- [ ] **Step 2: Verify the populated state**

Open `http://localhost:4321/books/reading` in a browser.

Expected:
- Section tabs visible at top, "Reading" highlighted.
- One cover (The Pigeon Tunnel) rendered at 140 × 210 with a soft drop shadow.
- Below the cover: title in Fraunces italic, author "John le Carré" in small grey, then `SINCE [MONTH] [YEAR]` in monospace uppercase.
- Clicking the cover opens `https://hardcover.app/books/the-pigeon-tunnel-stories-from-my-life` in a new tab.

- [ ] **Step 3: Verify mobile layout**

In browser dev tools, set the viewport to 375 × 812 (iPhone size).

Expected:
- The single book item stretches to full width, cover up to ~220px wide, centred in the column.
- Title, author, since-line below the cover, left-aligned within the item.
- No horizontal scroll on the page.

- [ ] **Step 4: Verify the missing-cover placeholder**

Temporarily edit `site/src/data/books-reading.json` and remove the `image_url` field (or set it to `""`) for the existing entry. Save.

Expected (after dev hot reload):
- The cover slot now shows a beige rectangle with a thin border, the title typeset in Fraunces italic and centred inside.
- Same drop shadow as a real cover; row height stays even.

Revert the JSON change before continuing — do not commit it.

- [ ] **Step 5: Verify the empty state**

Temporarily replace the contents of `site/src/data/books-reading.json` with `[]`. Save.

Expected:
- Section tabs render.
- Below them, a single line of body text reads `Between books at the moment.`
- No covers, no placeholders, no count.

Revert the JSON change before continuing — do not commit it.

- [ ] **Step 6: Verify the read and to-read pages still render**

Visit `http://localhost:4321/books/read` and `http://localhost:4321/books/toread`.

Expected:
- Both pages still render the year/month timeline as before — unchanged. No layout regressions.

- [ ] **Step 7: Stop the dev server and confirm clean working tree**

Stop `bun run dev` (Ctrl-C). Run:

```bash
git status
```

Expected: working tree clean (the JSON edits from steps 4 and 5 have been reverted; no other uncommitted changes).

- [ ] **Step 8: Final commit (if needed)**

If `git status` shows any uncommitted whitespace or accidental edits, review and either commit or revert. If working tree is clean, no commit needed for this task.

---

## Acceptance check against the spec

- [x] Row of covers on desktop with title, author, since-line — Task 4 (CSS) + Task 5 (markup), verified Task 6 step 2.
- [x] Covers click through to Hardcover in a new tab — Task 5 (`<a target="_blank" rel="noopener">`), verified Task 6 step 2.
- [x] Empty state renders the single sentence "Between books at the moment." — Task 5 conditional + Task 4 `.reading-shelf__empty`, verified Task 6 step 5.
- [x] Missing `image_url` renders the placeholder — Task 1 `hasCover` + Task 4 `.reading-shelf__placeholder` + Task 5 conditional, verified Task 6 step 4.
- [x] Mobile (375px) stacks vertically with no horizontal scroll — Task 4 `@media` query, verified Task 6 step 3.
- [x] Read and to-read pages untouched — only `reading.astro` modified, verified Task 6 step 6.
- [x] No JSON schema change — confirmed in plan file structure.
- [x] Sort by `date_updated` descending — Task 3 `sortByRecent`, used in Task 5.
- [x] Since-line format `SINCE [MONTH] [YEAR]` in en-GB — Task 2 `formatSince`.
