# Type Treatment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Fraunces + IBM Plex with Syne + Newsreader + Courier Prime, introduce ultramarine/inky colour system with dark mode and iridescent headline gradient, wire photos section to always use dark theme.

**Architecture:** All colour tokens live in `_variables.css` with a single dark mode override block targeting both `prefers-color-scheme: dark` and `[data-theme="dark"]`. `Base.astro` sets `data-theme="dark"` unconditionally when `section="photos"`. Special treatments (gradient headlines, gradient hr, blockquote rule, link underlines) live in `_base.css`.

**Tech Stack:** Astro 6, Bun, CSS custom properties, Google Fonts variable fonts (Syne, Newsreader, Courier Prime)

---

### Task 1: Replace Google Fonts import and theme-color meta

**Files:**
- Modify: `site/src/layouts/Base.astro`

- [ ] **Step 1: Replace the font import link and update theme-color**

In `site/src/layouts/Base.astro`, replace these three lines:

```astro
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
```

with:

```astro
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,600;1,6..72,300;1,6..72,400&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
```

Also update the `theme-color` meta. Replace:

```astro
    <meta name="theme-color" content="#2a3a2e" />
```

with:

```astro
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f4fc" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e1d1a" />
```

- [ ] **Step 2: Commit**

```bash
git add site/src/layouts/Base.astro
git commit -m "feat: swap Google Fonts to Syne + Newsreader + Courier Prime"
```

---

### Task 2: Rewrite `_variables.css` with new tokens and dark mode block

**Files:**
- Modify: `site/src/styles/_variables.css`

- [ ] **Step 1: Replace the entire file contents**

```css
:root {
  /* ── Palette: Ultramarine ── */
  --color-bg:           #f4f4fc;
  --color-bg-subtle:    #eeeef8;
  --color-text:         #0c0c24;
  --color-text-secondary: #3848c8;
  --color-accent:       #1828e0;
  --color-alt:          #c8920a;
  --color-border:       #c8ccf4;
  --color-border-light: #dcdff8;

  /* Gradient stops */
  --grad-a: #1828e0;
  --grad-b: #e8a800;

  /* Section: Notes (dark green — unchanged, addressed separately) */
  --color-notes-bg:     #2a3a2e;
  --color-notes-text:   #e8e4dc;
  --color-notes-accent: #7a8a6a;
  --color-notes-border: #3a4a3e;

  /* Section: Photos (near-black — kept for component-level overrides) */
  --color-photos-bg:     #1a1a18;
  --color-photos-text:   #e8e4dc;
  --color-photos-accent: #777;

  /* ── Typography ── */
  --font-display: 'Syne', system-ui, sans-serif;
  --font-body:    'Newsreader', Georgia, serif;
  --font-mono:    'Courier Prime', 'Courier New', monospace;

  /* Type scale */
  --text-xs:   0.625rem;
  --text-sm:   0.6875rem;
  --text-base: 0.875rem;
  --text-md:   0.9375rem;
  --text-lg:   1rem;
  --text-xl:   1.125rem;
  --text-2xl:  1.375rem;
  --text-3xl:  1.625rem;
  --text-4xl:  1.875rem;
  --text-5xl:  3rem;

  /* ── Spacing ── */
  --space-xs:  0.25rem;
  --space-sm:  0.5rem;
  --space-md:  1rem;
  --space-lg:  1.5rem;
  --space-xl:  2rem;
  --space-2xl: 3rem;
  --space-3xl: 4rem;

  /* ── Dimensions ── */
  --width-content:      680px;
  --width-content-wide: 1000px;
  --width-notes:        600px;

  font-family: var(--font-body);
  background: var(--color-bg);
  color: var(--color-text);
}

/* ── Dark mode: system preference OR explicit data-theme ── */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:           #1e1d1a;
    --color-bg-subtle:    #252420;
    --color-text:         #e5e0d5;
    --color-text-secondary: #c0b8a8;
    --color-accent:       #c8a255;
    --color-alt:          #28d8f0;
    --color-border:       #2e2c27;
    --color-border-light: #353330;
    --grad-a: #28d8f0;
    --grad-b: #e8a800;
  }
}

[data-theme="dark"] {
  --color-bg:           #1e1d1a;
  --color-bg-subtle:    #252420;
  --color-text:         #e5e0d5;
  --color-text-secondary: #c0b8a8;
  --color-accent:       #c8a255;
  --color-alt:          #28d8f0;
  --color-border:       #2e2c27;
  --color-border-light: #353330;
  --grad-a: #28d8f0;
  --grad-b: #e8a800;
}
```

- [ ] **Step 2: Start dev server and verify the site loads without errors**

```bash
bun run dev
```

Open http://localhost:4321. The site will look broken (Fraunces still referenced in CSS) — that's expected here. Confirm no build errors in the terminal.

- [ ] **Step 3: Commit**

```bash
git add site/src/styles/_variables.css
git commit -m "feat: new colour tokens, font stacks, dark mode block"
```

---

### Task 3: Rewrite `_base.css` — headline gradient, hr, blockquote, link underlines

**Files:**
- Modify: `site/src/styles/_base.css`

- [ ] **Step 1: Replace the entire file contents**

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
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1.2;
    background-image: linear-gradient(
      105deg,
      var(--grad-a) 0%,
      var(--grad-b) 50%,
      var(--grad-a) 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: type-shimmer 5s linear infinite;
  }

  @keyframes type-shimmer {
    to { background-position: 200% center; }
  }

  a {
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }

  a:hover {
    color: var(--color-accent);
  }

  blockquote {
    font-family: var(--font-body);
    font-style: italic;
    font-size: var(--text-xl);
    line-height: 1.5;
    color: var(--color-text-secondary);
    border-left: 2px solid var(--color-alt);
    padding-left: var(--space-lg);
    margin: var(--space-xl) 0;
  }

  hr {
    border: none;
    height: 1px;
    background-image: linear-gradient(
      90deg,
      var(--grad-a),
      var(--grad-b),
      var(--grad-a)
    );
    background-size: 200% auto;
    animation: type-shimmer 5s linear infinite;
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

  /* Body link underlines in prose contexts */
  .writing-single__body a,
  .note-single__body a {
    text-decoration-color: var(--color-alt);
    text-decoration-thickness: 1.5px;
    text-underline-offset: 3px;
  }

  /* Dotted in dark mode to soften cyan on warm ground */
  @media (prefers-color-scheme: dark) {
    .writing-single__body a,
    .note-single__body a {
      text-decoration-style: dotted;
    }
  }

  [data-theme="dark"] .writing-single__body a,
  [data-theme="dark"] .note-single__body a {
    text-decoration-style: dotted;
  }
}
```

- [ ] **Step 2: Check dev server — headlines should now shimmer**

The dev server from Task 2 should still be running. Hard-refresh http://localhost:4321. Headlines should now show the animated gradient (blue→gold in light, or cyan→gold if your OS is in dark mode). No errors in the browser console.

- [ ] **Step 3: Commit**

```bash
git add site/src/styles/_base.css
git commit -m "feat: headline shimmer gradient, gradient hr, blockquote + link accent"
```

---

### Task 4: Update `_layout.css` — nav to Syne 700, remove variation settings

**Files:**
- Modify: `site/src/styles/_layout.css`

- [ ] **Step 1: Update logo — remove variation settings, set weight to 800**

Find this block:

```css
  .site-header__logo {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 500;
    font-variation-settings: var(--fraunces-wonk);
    text-decoration: none;
  }
```

Replace with:

```css
  .site-header__logo {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    text-decoration: none;
  }
```

- [ ] **Step 2: Update nav links — set Syne 700 explicitly**

Find this block:

```css
  .site-header__link {
    font-size: var(--text-sm);
    text-decoration: none;
    color: var(--color-accent);
    letter-spacing: 0.3px;
  }
```

Replace with:

```css
  .site-header__link {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--text-sm);
    text-decoration: none;
    color: var(--color-accent);
    letter-spacing: -0.01em;
  }
```

- [ ] **Step 3: Update footer signoff — remove variation settings**

Find this block:

```css
  .site-footer__signoff {
    display: block;
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-variation-settings: var(--fraunces-wonk);
    font-style: italic;
    margin-bottom: 2px;
  }
```

Replace with:

```css
  .site-footer__signoff {
    display: block;
    font-family: var(--font-display);
    font-size: var(--text-base);
    font-weight: 700;
    font-style: italic;
    margin-bottom: 2px;
  }
```

- [ ] **Step 4: Verify in dev server**

Nav links should now be Syne 700 (geometric sans, tighter). Logo should be bolder. Confirm no `font-variation-settings` remains in `_layout.css`:

```bash
grep "font-variation-settings" site/src/styles/_layout.css
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add site/src/styles/_layout.css
git commit -m "feat: nav links to Syne 700, remove Fraunces variation settings from layout"
```

---

### Task 5: Strip all `font-variation-settings` from `_components.css`

**Files:**
- Modify: `site/src/styles/_components.css`

There are 18 occurrences. Remove the `font-variation-settings: var(--fraunces-wonk);` line from each — leave all surrounding properties intact.

- [ ] **Step 1: Remove all occurrences with a single sed command**

```bash
sed -i '' '/font-variation-settings: var(--fraunces-wonk);/d' site/src/styles/_components.css
```

- [ ] **Step 2: Verify none remain**

```bash
grep "font-variation-settings" site/src/styles/_components.css
```

Expected: no output.

- [ ] **Step 3: Check dev server for visual regressions**

Browse through http://localhost:4321 — check feed list, writing index, notes, library timeline, reading shelf, photo grid. Everything should render correctly. The Fraunces-specific variation axis is gone; Syne doesn't need it.

- [ ] **Step 4: Commit**

```bash
git add site/src/styles/_components.css
git commit -m "chore: remove Fraunces font-variation-settings from components"
```

---

### Task 6: Wire `data-theme="dark"` to photos pages in `Base.astro`

**Files:**
- Modify: `site/src/layouts/Base.astro`

- [ ] **Step 1: Add `data-theme` attribute conditionally to `<html>`**

Find this line in `Base.astro`:

```astro
<html lang="en-gb">
```

Replace with:

```astro
<html lang="en-gb" data-theme={section === "photos" ? "dark" : undefined}>
```

The `section` prop is already destructured at the top of the frontmatter. `undefined` means Astro omits the attribute entirely on non-photo pages, so light mode pages are unaffected.

- [ ] **Step 2: Verify photos section is always dark**

With the dev server running, navigate to http://localhost:4321/photos/. The page should render with the Inky dark background (`#1e1d1a`) regardless of your OS colour scheme setting. Inspect the `<html>` element and confirm `data-theme="dark"` is present.

Navigate to http://localhost:4321/ (home) and confirm `data-theme` is absent on the `<html>` element.

- [ ] **Step 3: Commit**

```bash
git add site/src/layouts/Base.astro
git commit -m "feat: photos section always renders in dark (Inky) theme"
```

---

### Task 7: Final verification and build

- [ ] **Step 1: Run the existing test suite**

```bash
bun test
```

Expected: all tests pass. The test suite covers lib utilities (tags, images, summary, reading) — none are affected by CSS changes.

- [ ] **Step 2: Production build**

```bash
bun run build
```

Expected: build completes with no errors. Check for any Astro warnings about missing CSS properties.

- [ ] **Step 3: Visual smoke-check against the design spec**

With `bun run preview` running (or check the build output), verify each element against the approved mockup:

| Check | Expected |
|-------|----------|
| Headlines (h1/h2/h3) | Syne 800, animated blue→gold→blue gradient (light) |
| Nav links | Syne 700, ultramarine colour |
| Logo | Syne 800, tight tracking |
| Body / prose | Newsreader, dark indigo (`#3848c8`) |
| Dates / tags / meta | Courier Prime |
| `<hr>` in articles | 1px gradient strip, same shimmer as headlines |
| Blockquote border-left | Gold (`#c8920a`) in light |
| In-prose links | Gold solid underline in light |
| Dark mode (OS-level) | Inky bg, amber accent, cyan→gold headline gradient |
| Dark mode links | Cyan dotted underline |
| `/photos/` page | Always Inky regardless of OS setting |
| `/photos/` h1 | `data-theme="dark"` on `<html>` |

- [ ] **Step 4: Final commit if any nits were fixed**

```bash
git add -p
git commit -m "fix: type treatment nits from smoke-check"
```
