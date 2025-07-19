# Really.lol Project Inconsistency Cleanup Plan

## Overview
This document outlines a comprehensive plan to address inconsistencies that have accumulated in the really.lol Hugo-based personal blog over time. The project shows clear evolution with different naming conventions, organizational approaches, and technical decisions made at different periods.

## Priority Levels
- **P1 (Critical)**: Issues that break functionality or cause major problems
- **P2 (High)**: Issues that affect maintainability, performance, or user experience
- **P3 (Medium)**: Issues that improve organization and consistency
- **P4 (Low)**: Nice-to-have improvements for future maintenance

---

## 1. Template System Issues

### P1 - Critical Template Problems **✅ RESOLVED**

#### 1.1 Missing Photo Single Template
**Issue**: No dedicated single page template for photos (`/layouts/photo/single.html`)
**Impact**: Photo content falls back to generic template, losing photo-specific functionality
**Action**: Create `/layouts/photo/single.html` with photo-specific layout and metadata display

#### 1.2 Duplicate Navigation Links
**Issue**: "Notes" appears twice in site header navigation
**File**: `themes/reallylol/layouts/partials/site-header.html:7,11`
**Action**: Remove duplicate navigation entry

### P2 - High Priority Template Issues

#### 1.3 Inconsistent CSS Class Naming
**Issue**: Mixed naming conventions across templates
- Notes: `note-main`, `note-section-main`, `note-list-item`
- Highlights: `highlight-main`, `highlight-section-main`, `highlight-list-item`
- Default: `single-main`, `section-main`, `section-item`
**Action**: Standardize to consistent BEM-style naming convention

#### 1.4 Inconsistent Icon Usage
**Issue**: Mixed icon implementations (inline SVG, icon partials, emoji fallbacks)
**Action**: Standardize to use icon partials consistently across all templates

### P3 - Medium Priority Template Issues

#### 1.5 Template Logic Inconsistencies
**Issue**: Different conditional logic patterns for same functionality
**Action**: Standardize date formatting, tag display, and media navigation logic

#### 1.6 Hardcoded Content
**Issue**: Hero images and navigation structure hardcoded in templates
**Action**: Move hardcoded content to configuration or data files

---

## 2. CSS System Overhaul

### P1 - Critical CSS Problems

#### 2.2 CSS Variable Conflicts
**Issue**: Inconsistent variable names and duplicate definitions
- `style.css`: `--color-background` vs `--color-background` (redefined)
- `application.css`: `--background-color`
**Action**: Consolidate to single variable naming convention

### P2 - High Priority CSS Issues

#### 2.3 Undefined Variable References
**Issue**: `style.css` references undefined variables (`--c-body`, `--c-bg2`, `--c-heading`)
**Action**: Define missing variables or remove references

#### 2.4 Duplicate CSS Rules
**Issue**: Multiple `img` rules and font family definitions
**Action**: Consolidate duplicate rules and optimize stylesheet

### P3 - Medium Priority CSS Issues

#### 2.5 Inconsistent Breakpoints
**Issue**: Different media query breakpoints between files
**Action**: Define consistent breakpoint system across all CSS files

#### 2.6 CSS Architecture Decision
**Issue**: Two different CSS approaches (BEM vs component-based)
**Action**: Choose one architecture and refactor accordingly

---

## 3. Content Organization and Naming

### P2 - High Priority Content Issues

#### 3.2 Photo Filename Evolution
**Issue**: Three distinct naming eras
- Hash-based (2012-2016): `2012-04-04-1fcd709146a04de0a09ed86f832fd1bc.md`
- Mixed (2017-2021): Various approaches
- Modern (2022+): `2022-05-24-why-log-on.md`
**Action**: Migrate old hash-based filenames to descriptive names where possible

### P3 - Medium Priority Content Issues

#### 3.3 Front Matter Inconsistencies
**Issue**: Inconsistent field ordering and presence across content types
**Action**: Standardize front matter structure and field ordering

#### 3.4 Highlight Filename Exceptions
**Issue**: Most highlights use date-slug format, some use timestamps
**Action**: Standardize all highlights to date-slug format

#### 3.5 Capitalization Inconsistencies
**Issue**: Recent photo files have mixed capitalization (`2025-07-13-Muck.md`)
**Action**: Standardize to lowercase filename convention

---

## 4. Image Asset Management

### P1 - Critical Image Issues

#### 4.1 Directory Duplication
**Issue**: Complete duplication between `/static/img/` and `/public/img/`
**Impact**: 2,670+ duplicate files, unnecessary disk usage
**Action**: Remove `/public/img/` duplication, ensure proper build process

### P2 - High Priority Image Issues

#### 4.2 Unclear Image Organization
**Issue**: Mixed content types in `/static/img/` root without clear categorization
**Action**: Reorganize images into logical subdirectories by purpose

#### 4.3 Inconsistent Image Naming
**Issue**: Multiple naming conventions in static root
- Date-prefixed: `2023-02-17-freud-ann.jpg`
- Descriptive: `autumn-trees-yellow.jpg`
- Topic-specific: `a11y-bad-captions.jpg`
**Action**: Implement consistent naming convention

### P3 - Medium Priority Image Issues

#### 4.4 Assets vs Static Confusion
**Issue**: No clear distinction between Hugo-processed assets and static files
**Action**: Define clear purpose for each directory and migrate accordingly

#### 4.5 File Format Optimization
**Issue**: Only JPG/PNG formats, no WebP optimization
**Action**: Consider WebP format for web optimization

---

## 6. Script and Tool Organization

### P3 - Medium Priority Script Issues

#### 6.1 Script Naming Inconsistencies
**Issue**: Mixed pluralization and file types
- `date-photo.sh` vs `date-photos.sh`
- `update-films.sh` vs `update-books.sh`
- `update-films.sql` mixed with shell scripts
**Action**: Standardize script naming convention

#### 6.2 Empty/Unused Directories
**Issue**: `scripts/tag-content-env/` empty, `scripts/prompts/` with single file
**Action**: Remove unused directories or document purpose

### P4 - Low Priority Script Issues

#### 6.3 Script Documentation
**Issue**: Limited documentation for script usage
**Action**: Add comprehensive README for script usage

---

## Implementation Phases

### Phase 1: Critical Fixes (P1)
**Timeline**: 1-2 weeks
- Create missing photo single template
- Remove duplicate navigation links
- Fix CSS file duplication
- Resolve CSS variable conflicts
- Clean up image directory duplication

### Phase 2: High Priority Improvements (P2)
**Timeline**: 2-4 weeks
- Standardize CSS class naming
- Consolidate content file naming
- Fix configuration inconsistencies
- Optimize image organization
- Clean repository maintenance issues

### Phase 3: Medium Priority Organization (P3)
**Timeline**: 4-6 weeks
- Standardize template logic
- Implement consistent breakpoints
- Migrate old content naming
- Reorganize script structure
- Improve front matter consistency

### Phase 4: Low Priority Enhancements (P4)
**Timeline**: Ongoing
- Add comprehensive documentation
- Implement WebP optimization
- Enhance script documentation
- Future-proof configuration

---

## Success Metrics

### Technical Metrics
- Reduction in duplicate files (target: 0 duplicates)
- Consistent naming patterns (target: 100% compliance)
- Build process efficiency (target: faster builds)
- CSS file size reduction (target: 30% reduction)

### Maintainability Metrics
- Reduced time for content creation
- Simplified development setup
- Improved theme customization
- Better content organization

---

## Risk Assessment

### Low Risk
- CSS consolidation and naming standardization
- Content file renaming
- Template improvements

### Medium Risk
- Image directory restructuring (potential broken links)
- Configuration changes (potential build issues)
- Script reorganization (workflow disruption)

### High Risk
- Major CSS architecture changes
- Content migration (potential data loss)
- Build process modifications

---

## Conclusion

This plan addresses 13 years of organic growth inconsistencies in the really.lol project. The phased approach prioritizes critical functionality fixes while progressively improving organization and maintainability. The project shows good foundational structure that can be enhanced through systematic cleanup.

**Next Steps**: Review and approve this plan, then begin with Phase 1 critical fixes while establishing backup procedures for safe implementation.
