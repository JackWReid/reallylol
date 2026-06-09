# Type Treatment Redesign

**Date:** 2026-05-13
**Status:** Approved

## Goal

Replace the current Fraunces + IBM Plex monoculture with a type system that has more soul and weirdness — deliberately chosen rather than algorithmically safe. Willing to sacrifice slickness for character.

## Type Stack

Three fonts, each with a distinct role:

| Role | Font | Weights | Notes |
|------|------|---------|-------|
| Display / headlines | Syne | 800 | `letter-spacing: -0.04em` |
| Nav links | Syne | 700 | `letter-spacing: -0.01em` |
| Body / prose | Newsreader | 300, 400 | 300 for long-form reading, 400 elsewhere |
| Labels, dates, tags, meta | Courier Prime | 400 | Replaces IBM Plex Mono |

### Google Fonts import

```
family=Syne:wght@700;800
family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,600;1,6..72,300;1,6..72,400
family=Courier+Prime:ital,wght@0,400;0,700;1,400
```

Replace the existing Fraunces + IBM Plex import in `site/src/layouts/Base.astro`.

---

## Colour System

Two modes. All tokens live in `site/src/styles/_variables.css`.

### Light mode

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f4f4fc` | Page background |
| `--color-bg-subtle` | `#eeeef8` | Subtle backgrounds (strips, hover states) |
| `--color-text` | `#0c0c24` | Primary text — headings, feed titles |
| `--color-text-secondary` | `#3848c8` | Body / prose text — dark indigo, reads warm against the slightly blue-white bg. Replaces current `#475545`. |
| `--color-accent` | `#1828e0` | Structural colour — nav links, dates, tags, borders |
| `--color-alt` | `#c8920a` | Alt accent — link underlines, blockquote rule |
| `--color-border` | `#c8ccf4` | Borders |
| `--color-border-light` | `#dcdff8` | Light borders, feed dividers |
| `--grad-a` | `#1828e0` | Gradient start/end (blue) |
| `--grad-b` | `#e8a800` | Gradient mid (gold) |

### Dark mode (Inky)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#1e1d1a` | Page background — warm near-black |
| `--color-bg-subtle` | `#252420` | Subtle backgrounds |
| `--color-text` | `#e5e0d5` | Primary text |
| `--color-text-secondary` | `#c0b8a8` | Body / prose text. Replaces current `#475545`. |
| `--color-accent` | `#c8a255` | Structural — nav links, dates, tags |
| `--color-alt` | `#28d8f0` | Alt accent — link underlines (dotted), blockquote rule |
| `--color-border` | `#2e2c27` | Borders |
| `--color-border-light` | `#353330` | Light borders |
| `--grad-a` | `#28d8f0` | Gradient start/end (cyan) |
| `--grad-b` | `#e8a800` | Gradient mid (gold) |

The gold mid-stop (`#e8a800`) is shared across both modes, tying light and dark together.

---

## Special Treatments

### Headline gradient

All `h1`, `h2`, `h3` get an animated shimmer gradient applied as text-fill. The gradient cycles at `background-size: 200%` over 5 seconds.

```css
h1, h2, h3 {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: -0.04em;
  background-image: linear-gradient(105deg,
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
```

**Light:** blue (`#1828e0`) → gold (`#e8a800`) → blue
**Dark:** cyan (`#28d8f0`) → gold (`#e8a800`) → cyan

### Gradient rule

The `<hr>` inside articles gets the same gradient treatment as a 1px strip rather than a solid border:

```css
hr {
  border: none;
  height: 1px;
  background-image: linear-gradient(90deg,
    var(--grad-a), var(--grad-b), var(--grad-a)
  );
  background-size: 200% auto;
  animation: type-shimmer 5s linear infinite;
}
```

### Blockquote left rule

The `border-left` on blockquotes uses `--color-alt` (gold in light, cyan in dark) rather than the muted border colour:

```css
blockquote {
  border-left: 2px solid var(--color-alt);
  /* ... existing padding/font rules ... */
}
```

### Body link underlines

In-prose links use `--color-alt` for the underline decoration. Dark mode uses `dotted` style to soften the cyan against the warm ground; light mode uses `solid`.

```css
.writing-single__body a,
.note-single__body a {
  text-decoration-color: var(--color-alt);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
```

```css
/* dark mode override */
@media (prefers-color-scheme: dark) {
  .writing-single__body a,
  .note-single__body a {
    text-decoration-style: dotted;
  }
}
```

---

## CSS Variable Renames

The existing `--font-display`, `--font-body`, `--font-body` variable names stay. Values change:

```css
--font-display: 'Syne', system-ui, sans-serif;
--font-body:    'Newsreader', Georgia, serif;
--font-body:    'Courier Prime', 'Courier New', monospace;
```

Remove `--fraunces-wonk` and all `font-variation-settings: var(--fraunces-wonk)` references — Syne has no equivalent axis.

---

## Dark Mode Implementation

The site currently has no dark mode. This spec defines the token values for both modes; the implementation plan must decide the mechanism:

- **`@media (prefers-color-scheme: dark)` only** — simplest, automatic, no toggle
- **CSS class on `<html>` + media query** — allows a user-controlled toggle later

Recommendation: start with `prefers-color-scheme` only. A toggle can be added later without changing the token structure.

All dark mode overrides go in a single block at the bottom of `_variables.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #1e1d1a;
    /* ... etc */
  }
}
```

---

## Section Overrides

### Photos — always dark

The photos section (`/photos`, individual photo pages) always renders in the Inky dark theme regardless of the user's system preference. Apply the dark token values unconditionally on `.photos-*` pages by adding a `data-theme="dark"` attribute to `<html>` in the photos layout, and targeting that in CSS alongside the media query:

```css
@media (prefers-color-scheme: dark),
[data-theme="dark"] {
  :root {
    --color-bg: #1e1d1a;
    /* ... all dark tokens ... */
  }
}
```

In the photos Astro layout, set the attribute server-side:

```astro
<html lang="en-gb" data-theme="dark">
```

---

## What Doesn't Change

- Type scale (`--text-xs` through `--text-5xl`) — values unchanged
- Spacing tokens
- Layout widths
- Notes section dark green background — to be addressed separately

---

## Files to Touch

| File | Change |
|------|--------|
| `site/src/layouts/Base.astro` | Replace Google Fonts import |
| `site/src/styles/_variables.css` | New colour tokens + font stack values, remove `--fraunces-wonk` |
| `site/src/styles/_base.css` | Headline gradient + shimmer animation, blockquote rule, hr gradient, body link underlines |
| `site/src/styles/_components.css` | Remove all `font-variation-settings: var(--fraunces-wonk)` references |
| `site/src/styles/_specials.css` | No variation settings — no changes needed |
