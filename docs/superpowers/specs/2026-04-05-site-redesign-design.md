# really.lol Site Redesign

Design spec for a complete visual and structural redesign of really.lol.

## Goals

- Fresh visual identity that still feels personal, literary, and warm
- Fix navigation confusion (too many layers, poor mobile experience)
- Replace awkward pagination everywhere
- Give each content section its own visual personality
- Consolidate fragmented link-adjacent content (highlights, saved links, blogroll)
- Make the homepage useful as a feed/portal
- Make photos and library pages more interesting to browse
- Integrate PDIA (Public Domain Image Archive) images as decorative texture throughout

## Typography

Three-font system using Google Fonts:

| Font | Role | Usage |
|------|------|-------|
| **Fraunces** (variable, WONK + SOFT axes) | Display/personality | Logo, headlines, titles, blockquotes, book/film titles |
| **IBM Plex Sans** (300, 400, 500, 600) | Body/UI | Body text (weight 300 for long-form), navigation, UI labels |
| **IBM Plex Mono** (400, 500) | Utility | Dates, tags, metadata, section type labels |

Fraunces carries the site's personality - it's a wonky old-style serif with the feel of handmade ceramics. IBM Plex provides clean functional contrast. The pairing creates tension between warmth and precision.

### Type scale

- Logo: Fraunces 19-20px, weight 500, `font-variation-settings: 'WONK' 1`
- Featured headline: Fraunces 30px, weight 400
- List headline: Fraunces 17-26px, weight 400
- Body: IBM Plex Sans 14-15px, weight 300, line-height 1.75
- Meta/dates: IBM Plex Mono 10-11px
- Tags: IBM Plex Mono 10-11px
- Nav links: IBM Plex Sans 11-12px
- Section type labels: IBM Plex Mono 10px, uppercase, letter-spacing 1-1.5px

## Colour Palette: Deep Shelf

Warm grey and forest green. Library energy - grounded, natural, calm.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#f0eeea` | Default page background |
| `--text` | `#2a3a2e` | Primary text, headings, borders |
| `--text-secondary` | `#5a6658` | Body text, excerpts |
| `--accent` | `#7a8a6a` | Metadata, dates, tags, nav links, section labels |
| `--border` | `#d5d2ca` | Dividers, separators |
| `--border-light` | `#e8e5de` | Subtle dividers within lists |
| `--notes-bg` | `#2a3a2e` | Notes section background (inverted) |
| `--notes-text` | `#e8e4dc` | Notes section text |
| `--notes-accent` | `#7a8a6a` | Notes section dates (same sage) |
| `--notes-border` | `#3a4a3e` | Notes section dividers |
| `--photos-bg` | `#1a1a18` | Photos section background |
| `--photos-text` | `#e8e4dc` | Photos section text |
| `--photos-accent` | `#777` | Photos section metadata |

## Navigation

### Structure

Single flat navigation bar on every page:

```
really.lol                    Writing  Notes  Photos  Library  Links
```

- Logo (Fraunces, left-aligned) links to homepage
- Five section links (IBM Plex Sans, right-aligned)
- Active section indicated by underline (`text-underline-offset: 4px`)
- Separated from content by a 1.5px solid border in `--text` colour
- No sub-navigation in the main nav bar

### Sub-categories

Sub-categories within sections are implemented as **tabs within the section page**, not as nav items:

- Library: `Books - Read | Reading | To Read | Films - Watched | To Watch`
- Links: `Saved | Highlights | Blogroll`

Tabs use: IBM Plex Sans 12px, active tab gets `border-bottom: 2px solid --text`, inactive tabs in `--accent` colour.

### Mobile

At small viewports, navigation links collapse. Exact mobile pattern TBD during implementation (hamburger menu or horizontal scroll with overflow).

## Pages

### Homepage (Feed)

Mixed chronological feed showing recent items from all content types.

**Featured item (latest):**
- Two-column layout: text left, PDIA decorative image right
- Type label in Plex Mono (e.g. "journal", "photo", "note")
- Fraunces headline at 30px
- Excerpt in Plex Sans
- PDIA image in a muted placeholder block (180px wide)

**Feed items (subsequent):**
- Single column list
- Each item: Fraunces title (17px), Plex Mono type + date below
- Photos get a small thumbnail (48px square) right-aligned
- Items separated by 1px border in `--border`

**Load more:** Replaces pagination. Centred "Load more" link in Plex Sans / `--accent` colour. Client-side (Preact island).

### Writing

Posts and journal entries. The core editorial experience.

**Layout:** Single column, max-width ~680px.

**List view:**
- Each post: date + tags in Plex Mono, Fraunces headline (26px), excerpt in Plex Sans
- Posts separated by border + generous spacing (36px)
- "Load more" at bottom

**Single post (reading view):**
- Plex Mono meta line: `journal . 5 Apr 2026 . 4 min read`
- Fraunces headline (30px)
- Body in Plex Sans 15px, weight 300, line-height 1.75, max-width ~640px
- Blockquotes in Fraunces italic, `border-left: 2px solid --border`, lighter colour
- Tags at bottom in Plex Mono, separated by `--border` rule
- Back link in nav area

### Notes

Short, untitled microblog entries. **Distinct visual treatment** - a different room.

**Background:** `--notes-bg` (`#2a3a2e`, dark forest green)
**Text:** `--notes-text` (`#e8e4dc`, warm light)
**Nav:** Adapts - logo and active link in light, other links in muted green

**Layout:** Centred column, max-width ~600px, generous vertical padding (48px between entries).

**Each note:**
- Fraunces 22px, weight 300, line-height 1.45
- Date in Plex Mono below, `--notes-accent` colour
- Notes separated by subtle border (`--notes-border`) with large padding

**Feel:** Intimate, quiet, slower reading pace. The large type and dark background create focus.

### Photos

Visual-first gallery. **Dark background** to make images pop.

**Background:** `--photos-bg` (`#1a1a18`, near-black)
**Nav:** Adapts to dark background like Notes

**Layout:** 3-column masonry-style grid, 6px gaps, small border-radius (2px).

**Image cards:**
- Images fill their grid cell with `object-fit: cover`
- On hover/focus: gradient overlay from bottom with title (Fraunces 13px) and location + date (Plex Mono 9px)
- No text visible by default - images only

**Single photo view:** TBD - currently uses server-rendered on-demand pages. Keep this pattern but adapt styling to the new dark treatment.

**Load more** at bottom in muted colour.

### Library (Books + Films)

Books and films unified in one section. **Text-only, no cover images.** Timeline view grouped by month.

**Background:** Default `--bg` (light)

**Tabs:**
- All on one row: `Books - Read | Reading | To Read  ||  Films - Watched | To Watch`
- Books and films groups separated by a visual divider (border-left + padding on the films group)
- Clicking a tab filters the list; the timeline layout is the same for all tabs

**Timeline layout (Read/Watched):**
- Big year marker: Fraunces 48px, weight 300, with border below
- Month subheads: Plex Mono 10px uppercase with count ("March - 4 books")
- Each item: Fraunces title (16px) + Plex Sans author (12px) on same line, separated by spacing
- Items separated by subtle `--border-light` rules

**Reading/To Read/To Watch:**
- Same timeline layout but without month grouping (just a flat list)
- Or grouped differently (TBD based on data shape)

**Stats line at bottom:** Plex Mono, "1,411 books . 342 authors" - small, muted

### Links (Saved + Highlights + Blogroll)

Consolidated from three previously separate areas.

**Background:** Default `--bg` (light)

**Tabs:** `Saved | Highlights | Blogroll`

**Saved links layout:**
- Dense list, max-width ~700px
- Each link: title (Plex Sans 14px, weight 500) with domain (Plex Mono 9px) right-aligned
- Tags + date below in Plex Mono
- Items separated by `--border-light` rules

**Highlights layout:**
- Similar to saved links but with a blockquote excerpt (Fraunces italic) below the title
- Source link and date in Plex Mono

**Blogroll layout:**
- Simple list of site names + descriptions
- Possibly grouped by category if that data exists

## PDIA Integration

Public Domain Image Archive (pdimagearchive.org) images used as decorative elements.

**Homepage:** A PDIA image sits alongside the featured item. Changes periodically (on each build, or randomised client-side).

**Section headers:** Optionally, each section could have a rotating PDIA image as a decorative header element. This is an enhancement, not a launch requirement.

**Implementation:** At build time, fetch or select from a curated set of PDIA image URLs/files stored in R2. Details of the fetching/curation mechanism TBD during implementation.

## Footer

Appears on every page, adapts to section background colour.

**Contents:**
- Social/site links: Mastodon (@nice), /now page, RSS feed
- "Fresh as of [date]" timestamp

**Removed:** Random photo from footer (the homepage feed serves this purpose now).

## Pagination Replacement

All paginated views switch to "Load more" using Preact islands (`client:load`).

Sections affected: Homepage feed, Writing list, Notes list, Photos grid, Library timeline, Links list.

Each starts with ~24 items and loads the next batch on click. The Preact island manages state and fetches from the CMS API or pre-built static data.

## Responsive Approach

- Max content width: ~700px for reading, ~1000px for grids
- Nav collapses at small viewport (pattern TBD)
- Photos grid: 3 columns -> 2 -> 1 on mobile
- Library timeline: single column throughout
- Links: single column throughout
- Notes: narrows but stays centred

## What's Not Changing

- **Content model:** No changes to CMS content types or data schema
- **Build architecture:** Still Astro on Cloudflare Pages, CMS on Workers
- **Photo SSR:** Photo detail pages remain server-rendered
- **Content loaders:** Same CMS loader pattern, same API
- **CMS admin UI:** No changes to the admin interface

## Open Questions

- Mobile nav pattern: hamburger vs horizontal scroll vs something else
- PDIA image curation: manual selection vs automated fetch vs both
- Reading/To Read list grouping: flat list or some other organisation
- Whether to link book titles to related blog posts (requires data model addition)
- Photo single-page redesign details (dark treatment, layout)
- Note single-page view (currently notes link somewhere - keep or change?)
