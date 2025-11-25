# Client-Side Pagination Implementation Plan

## Overview
Implement client-side pagination for the watched, towatch, read, and toread pages. The backend will continue to render all items, but JavaScript will filter to show 24 items per page with navigation controls.

## Requirements
- Vanilla JavaScript only
- Use data-* attributes for markup
- No content flash on page load
- Graceful fallback if JavaScript fails
- Lazy load images for items not on current page
- Update URL params (?page=2) without navigation
- Read URL params to jump to specific page
- Only activate if there are more than 24 items

## Implementation Steps

### 1. Modify Shortcodes

#### `filmtable.html`
- Add `data-paginate="true"` attribute to the `<table>` element
- Add `data-item` attribute to each `<tr>` in tbody
- Wrap tbody content in a container with `data-pagination-container`
- Add a hidden pagination controls container after the table

#### `booktable.html`
- Add `data-paginate="true"` attribute to the `<ul>` element
- Add `data-item` attribute to each `<li>` element
- Add a hidden pagination controls container after the list
- Change `loading="lazy"` to `loading="lazy" data-lazy-image` for images on non-visible pages

### 2. Create JavaScript Module

#### `static/js/media-pagination.js`
- Check if pagination is needed (count items with `data-item`)
- Only initialize if count > 24
- Read `?page=N` from URL params on load
- Hide all items initially (CSS will handle this)
- Show items for current page (1-indexed)
- Create pagination controls (Previous/Next buttons)
- Update URL params using `history.pushState()` (no navigation)
- Handle browser back/forward with `popstate` event
- For books: Only load images for visible items (use `loading="lazy"` and `data-src` pattern)

### 3. CSS Updates

#### Add to `style.css`
- Hide pagination controls by default (show when JS initializes)
- Style pagination controls (buttons, container)
- Add `.pagination-hidden` class for items not on current page
- Ensure smooth transitions (avoid flash)

### 4. Template Integration

#### `baseof.html` or `media/single.html`
- Add script tag to load `media-pagination.js`
- Load after DOM content is ready
- Use defer attribute for script loading

## Technical Details

### Data Attributes
- `data-paginate="true"` - Marks container as paginatable
- `data-item` - Marks each item in the list
- `data-page` - Current page number (set by JS)
- `data-total-pages` - Total number of pages (calculated)

### URL Parameter
- `?page=N` where N is 1-indexed page number
- Default to page 1 if not specified
- Validate page number (must be between 1 and max pages)

### Image Lazy Loading Strategy
- For books: Images on page 1 load normally
- Images on other pages: Use `data-src` instead of `src`, load when page becomes visible
- Use Intersection Observer or manual loading when page changes

### Fallback Behavior
- If JavaScript fails: All items remain visible (no pagination)
- If page number is invalid: Default to page 1
- If no items: Don't initialize pagination

## File Changes

1. `themes/reallylol/layouts/_shortcodes/filmtable.html` - Add data attributes
2. `themes/reallylol/layouts/_shortcodes/booktable.html` - Add data attributes and lazy loading
3. `themes/reallylol/static/js/media-pagination.js` - New file with pagination logic
4. `themes/reallylol/static/css/style.css` - Add pagination styles
5. `themes/reallylol/layouts/media/single.html` - Add script tag

## Testing Considerations

- Test with < 24 items (should not paginate)
- Test with exactly 24 items (should not paginate)
- Test with > 24 items (should paginate)
- Test URL parameter parsing
- Test browser back/forward buttons
- Test with JavaScript disabled (should show all items)
- Test image loading for books (only visible page)
- Test on mobile devices

## Performance Considerations

- Images for non-visible pages should not load until needed
- Use `loading="lazy"` native attribute where possible
- Consider using `IntersectionObserver` for advanced lazy loading
- Minimize DOM manipulation (cache references)
- Use `requestAnimationFrame` for smooth transitions if needed
