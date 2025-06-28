# Scripts Directory

This directory contains various utility scripts for managing the reallylol blog content and data.

## Content Creation Scripts

### `new-post.sh`
Creates a new blog post with proper frontmatter and opens it in vim for editing.

**Usage:**
```bash
./scripts/new-post.sh
```

**What it does:**
- Prompts for slug and title
- Creates a new markdown file in `content/post/` with today's date
- Includes basic frontmatter with journal tag
- Opens the file in vim for editing

### `new-photo.sh`
Creates a new photo post with metadata extracted from image EXIF data.

**Usage:**
```bash
./scripts/new-photo.sh path/to/photo.jpg
```

**What it does:**
- Extracts creation date from image EXIF data
- Prompts for slug, title, location, tags, and alt text
- Copies and resizes the image to `static/img/photo/`
- Creates a markdown file in `content/photo/` with proper frontmatter
- Formats tags as YAML list

**Requirements:**
- `exiftool` for EXIF data extraction
- `imagemagick` for image processing (`brew install imagemagick`)

### `new-note.sh`
Creates a quick note with timestamp.

**Usage:**
```bash
./scripts/new-note.sh
```

**What it does:**
- Prompts for note content
- Creates a markdown file in `content/note/` with current timestamp
- Includes basic frontmatter

## Content Management Scripts

### `date-photo.sh`
Renames a photo file to include its date prefix and updates the corresponding markdown file.

**Usage:**
```bash
./scripts/date-photo.sh path/to/photo.jpg
```

**What it does:**
- Finds the corresponding markdown file for the photo
- Extracts the date from the markdown frontmatter
- Renames the photo file to include the date prefix
- Updates the markdown file to reference the new filename

### `date-photos.sh`
Batch processes all photo markdown files to ensure they have proper date prefixes.

**Usage:**
```bash
./scripts/date-photos.sh
```

**What it does:**
- Scans all markdown files in `content/photo/`
- Checks if the filename matches the date in frontmatter
- Renames files that don't match the expected pattern

**Note:** This script includes commented-out code for renaming image files as well - use with caution.

## Content Tagging Scripts

### `tag-content.sh`
AI-powered content tagging using Google's Gemini API.

**Usage:**
```bash
# Tag text content
./scripts/tag-content.sh text "Your content here"

# Tag a markdown file
./scripts/tag-content.sh file path/to/content.md

# Tag an image
./scripts/tag-content.sh image path/to/image.jpg
```

**What it does:**
- Uses AI to analyze content and suggest relevant tags
- Prioritizes existing taxonomy tags
- Can suggest novel tags when needed
- Outputs structured JSON with tag suggestions

**Requirements:**
- Google Gemini API key (set in `GEMINI_API_KEY` environment variable)
- Python 3.13+ with uv package manager
- Dependencies managed in `tag-content-env/` directory

**Setup:**
```bash
cd scripts/tag-content-env
uv sync
```

### `tag-content-env/`
Python environment for the tagging functionality.

**Contents:**
- `tag-content.py` - Main tagging logic
- `pyproject.toml` - Python dependencies
- `uv.lock` - Locked dependency versions

## Data Management Scripts

### `update-books.sh`
Updates book data from okudl (Obsidian plugin) exports.

**Usage:**
```bash
./scripts/update-books.sh
```

**What it does:**
- Exports to-read, currently reading, and read books from okudl
- Saves data as JSON files in `data/books/`

**Requirements:**
- `okudl` command-line tool
- `jq` for JSON processing

### `update-films.sh`
Updates film data from Letterboxd exports.

**Usage:**
```bash
./scripts/update-films.sh path/to/letterboxd-export/
```

**What it does:**
- Processes Letterboxd CSV exports (watchlist.csv and diary.csv)
- Uses SQLite to transform data into JSON format
- Saves to `data/films/watched.json` and `data/films/towatch.json`

**Requirements:**
- SQLite3
- Letterboxd data export (from https://letterboxd.com/settings/data/)

### `update-films.sql`
SQLite script for processing Letterboxd data.

**What it does:**
- Imports CSV files into temporary tables
- Transforms data into JSON format
- Handles both watchlist and diary entries

## Prompts Directory

### `prompts/tag-content.md`
Contains the prompt template used by the AI tagging system.

## General Notes

- All scripts use `set -euo pipefail` for robust error handling
- Scripts are designed to work from the project root directory
- File paths are relative to the project root
- Most scripts include safety checks and validation

## Dependencies

**System Requirements:**
- Bash shell
- `exiftool` (for photo metadata)
- `imagemagick` (for image processing)
- `sqlite3` (for film data processing)
- `jq` (for JSON processing)
- `okudl` (for book data)

**Python Requirements:**
- Python 3.13+
- uv package manager
- Google Generative AI library
- Other dependencies listed in `tag-content-env/pyproject.toml` 