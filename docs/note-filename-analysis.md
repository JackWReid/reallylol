# Note Filename Analysis - Problem 3.1

## Total Files Analyzed
- **Total note files**: 102 (excluding _index.md)
- **Analysis date**: 2025-07-18

## Filename Format Categories

### 1. Date-Time with Descriptive Names (Most Recent/Preferred)
**Pattern**: `YYYY-MM-DD-descriptive-name.md`
**Count**: 4 files
**Files**:
- `2025-01-21-berlin-bolthole.md`
- `2025-02-10-german-law.md`
- `2025-02-10-sometimes.md`
- `2025-03-27-come-to-work.md`

### 2. Legacy Named Notes (Earliest)
**Pattern**: `YYYY-MM-DD-description.md`
**Count**: 2 files
**Files**:
- `2020-04-26-first-note.md`
- `2020-04-26-second-note.md`

### 3. ISO DateTime with Hyphens
**Pattern**: `YYYY-MM-DDTHH-MM-SS.md`
**Count**: 20 files
**Examples**:
- `2020-04-27T21-23-08.md`
- `2020-05-01T11-12-57.md`
- `2020-05-31T10-00-00.md`

### 4. ISO DateTime with Colons
**Pattern**: `YYYY-MM-DDTHH:MM:SS.md`
**Count**: 16 files
**Examples**:
- `2020-07-10T10:07:06.md`
- `2020-08-25T10:05:16.md`
- `2021-01-17T00:12:23.md`

### 5. ISO DateTime with Milliseconds and Z suffix
**Pattern**: `YYYY-MM-DDTHH:MM:SS.sssZ.md`
**Count**: 18 files
**Examples**:
- `2020-04-28T14:45:26.936Z.md`
- `2020-05-03T18:50:44.381Z.md`
- `2020-05-13T08:46:05.059Z.md`

### 6. Mixed ISO DateTime (Colons + Milliseconds, No Z)
**Pattern**: `YYYY-MM-DDTHH:MM:SS.sss.md`
**Count**: 42 files
**Examples**:
- `2023-01-06T10:01:42.md`
- `2023-02-22T08:22:08.md`
- `2024-04-16T08:55:25.md`

## Current Script Behavior
The `new-note.sh` script currently generates filenames using:
- **Format**: `YYYY-MM-DDTHH:MM:SS.md`
- **Command**: `date +"%Y-%m-%dT%H:%M:%S"`
- **Category**: #3 (ISO DateTime with Colons)

## Cross-Reference Analysis
**Result**: No cross-references found
- No markdown links to other note files
- No Hugo `ref` or `relref` shortcodes
- Safe to rename files without breaking internal links

## Inconsistency Issues Identified

1. **Five different timestamp formats** across 102 files
2. **Inconsistent separators**: hyphens vs colons in time portions
3. **Inconsistent precision**: some with milliseconds, some without
4. **Mixed timezone indicators**: some with Z suffix, some without
5. **Recent shift to descriptive names** (2025 files) vs timestamp-only names

## Recommended Standardization Target

Based on the most recent files (2025) and clarity, recommend:
**Target format**: `YYYY-MM-DD-descriptive-slug.md`

This format:
- Maintains chronological sorting
- Provides human-readable context
- Follows modern Hugo content practices
- Matches the pattern used in recent files
- Eliminates timestamp precision inconsistencies