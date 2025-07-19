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

**Example:**
```bash
$ ./scripts/new-post.sh
Slug: my-new-blog-post
Title: My Amazing New Blog Post
# Creates content/post/2025-07-19-my-new-blog-post.md and opens in vim
```

### `new-photo.sh`
Creates a new photo post with metadata extracted from image EXIF data.

**Usage:**
```bash
./scripts/new-photo.sh path/to/photo.jpg
```

**What it does:**
- Extracts creation date from image EXIF data using `exiftool`
- Prompts for slug, title, location, tags, and alt text
- Copies and resizes the image to `static/img/photo/` (max 1400px, 100% quality)
- Creates a markdown file in `content/photo/` with proper frontmatter
- Formats tags as YAML list in frontmatter

**Requirements:**
- `exiftool` for EXIF data extraction (`brew install exiftool`)
- `imagemagick` for image processing (`brew install imagemagick`)

**Example:**
```bash
$ ./scripts/new-photo.sh ~/Downloads/vacation.jpg
Slug: beach-sunset
Title: Beautiful Beach Sunset
Location: Brighton Beach
Tags [comma separated]: sunset, beach, travel, uk
Alt text: Golden sunset over Brighton Beach with waves
# Creates content/photo/2025-07-19-beach-sunset.md and static/img/photo/2025-07-19-beach-sunset.jpg
```

### `new-note.sh`
Creates a quick note with timestamp.

**Usage:**
```bash
./scripts/new-note.sh
```

**What it does:**
- Prompts for note content (used as title)
- Generates URL-friendly slug from note content
- Creates a markdown file in `content/note/` with current timestamp
- Includes basic frontmatter with date and title

**Example:**
```bash
$ ./scripts/new-note.sh
Note: just discovered this amazing coffee shop in soho
# Creates content/note/2025-07-19-just-discovered-this-amazing-coffee-shop-in-soho.md
```

## Content Management Scripts

### `date-photo.sh`
Batch processes all photo markdown files to ensure they have proper date prefixes.

**Usage:**
```bash
./scripts/date-photo.sh
```

**What it does:**
- Scans all markdown files in `content/photo/`
- Extracts the date from each file's frontmatter
- Checks if the filename already starts with that date
- Renames files that don't match the expected `YYYY-MM-DD-slug.md` pattern

**Example output:**
```bash
[MATCH] 2025-07-19-beach-sunset.md : 2025-07-19
[MISS] vacation-photo.md : 2025-07-15
# Renames vacation-photo.md to 2025-07-15-vacation-photo.md
```

**Note:** This script includes commented-out code for renaming image files as well - use with caution.

### `create-note-mapping.py`
Python script that analyzes all note files and generates a mapping for consistent renaming.

**Usage:**
```bash
python3 scripts/create-note-mapping.py
```

**What it does:**
- Scans all markdown files in `content/note/`
- Extracts titles from frontmatter and dates from filenames
- Generates URL-friendly slugs from titles
- Creates a mapping of current filenames to proposed new filenames
- Outputs `note-mapping.json` with the mapping data
- Generates `rename-notes.sh` script for bulk renaming

**Features:**
- Handles various date formats in filenames (ISO timestamps, simple dates)
- Creates descriptive slugs from titles (max 50 characters)
- Handles duplicate slug conflicts by adding numbers
- Comprehensive error handling and reporting

**Output files:**
- `scripts/note-mapping.json` - Complete mapping data in JSON format
- `scripts/rename-notes.sh` - Executable bash script for performing renames

### `rename-notes.sh`
Auto-generated bash script for renaming note files to consistent format.

**Usage:**
```bash
./scripts/rename-notes.sh
```

**What it does:**
- Executes the renaming operations defined in the mapping created by `create-note-mapping.py`
- Renames files from various timestamp formats to `YYYY-MM-DD-descriptive-slug.md`
- Changes directory to `content/note/` before executing

**Note:** This is an auto-generated script. Review the contents before running, as the operations are not easily reversible.

## Content Tagging Scripts

### `tag-content.sh`
AI-powered content tagging using Google's Gemini API with sophisticated taxonomy awareness.

**Usage:**
```bash
# Tag text content directly
./scripts/tag-content.sh text "Your content here"

# Tag a markdown file
./scripts/tag-content.sh file path/to/content.md

# Tag an image
./scripts/tag-content.sh image path/to/image.jpg
```

**What it does:**
- Uses Google's Gemini 1.5 Flash model to analyze content intelligently
- Prioritizes existing taxonomy tags from your blog's current tag system
- Scans all content types (`post`, `photo`, `highlight`, `note`) to build taxonomy
- Can suggest up to 2 novel tags when existing ones don't fit
- Outputs structured JSON with categorized tag suggestions
- Handles both text and image content analysis

**Requirements:**
- Google Gemini API key (set in `GEMINI_API_KEY` environment variable)
- Python 3.13+ with uv package manager
- Dependencies managed in `tag-content-env/` directory

**Setup:**
```bash
cd scripts/tag-content-env
uv sync
export GEMINI_API_KEY="your-api-key-here"
```

**Example output:**
```json
{
  "description": ["A beautiful sunset over Brighton Beach with golden light"],
  "existing": ["travel", "uk"],
  "new": ["sunset", "beach", "brighton"],
  "novel": ["golden-hour"]
}
```

**Features:**
- Rich console output with progress indicators
- Automatic taxonomy building from existing content
- Smart path handling (relative/absolute paths)
- Comprehensive error handling
- Template-based prompting system

### `tag-content-env/`
Isolated Python environment for the AI tagging functionality.

**Contents:**
- `tag-content.py` - Main tagging logic with Rich UI and Gemini integration
- `tag-content.md` - AI prompt template for content tagging
- `pyproject.toml` - Python dependencies specification
- `uv.lock` - Locked dependency versions for reproducibility
- `main.py` - Entry point module

**Key dependencies:**
- `google-generativeai` - Gemini API client
- `python-frontmatter` - YAML frontmatter parsing
- `rich` - Rich terminal UI with spinners and formatting
- `typer` - CLI framework
- `pyyaml` - YAML processing

## Data Management Scripts

### `update-books.sh`
Updates book data using the [cover CLI](https://github.com/jackreid/cover) and Hardcover API.

**Usage:**
```bash
./scripts/update-books.sh
```

**What it does:**
- Fetches book data from Hardcover API using the cover CLI tool
- Exports three reading states: to-read, currently reading, and read books
- Uses `--blog` format for JSON output compatible with Hugo data
- Handles "No books found" messages by converting to empty JSON arrays
- Saves data as JSON files in `data/books/` directory

**Requirements:**
- `cover` CLI tool installed from [jackreid/cover](https://github.com/jackreid/cover)
- `HARDCOVER_API_KEY` environment variable set
- Hardcover account and API access

**Setup:**
```bash
# Install cover CLI (requires Go)
go install github.com/jackreid/cover@latest

# Set API key
export HARDCOVER_API_KEY="your-hardcover-api-key"
```

**Output files:**
- `data/books/toread.json` - Books marked as want to read
- `data/books/reading.json` - Currently reading books
- `data/books/read.json` - Completed books

**Error handling:**
- Validates cover CLI is installed before running
- Checks for API key presence
- Creates books directory if it doesn't exist
- Handles temporary files safely

### `update-film.sh`
Updates film data from Letterboxd CSV exports using SQLite processing.

**Usage:**
```bash
./scripts/update-film.sh path/to/letterboxd-export/
```

**What it does:**
- Processes Letterboxd CSV exports (`watchlist.csv` and `diary.csv`)
- Copies CSV files to temporary directory for processing
- Uses SQLite with `update-film.sql` to transform data into JSON format
- Cleans up temporary files after processing
- Saves to `data/films/watched.json` and `data/films/towatch.json`

**Requirements:**
- SQLite3 (typically pre-installed on macOS/Linux)
- Letterboxd data export (download from https://letterboxd.com/settings/data/)

**Example:**
```bash
# Download and extract Letterboxd export first
$ ./scripts/update-film.sh ~/Downloads/letterboxd-export/
Updating films pages from Letterboxd export
https://letterboxd.com/settings/data/ for latest ZIP
```

**Input files expected:**
- `watchlist.csv` - Films on your watchlist
- `diary.csv` - Films you've watched with ratings and dates

### `update-film.sql`
SQLite script for processing Letterboxd CSV data into JSON format.

**What it does:**
- Sets CSV import mode and imports both CSV files into temporary tables
- Switches to JSON output mode
- Extracts watchlist data with `Name`, `Year`, and `Date` fields
- Extracts diary data with `Name`, `Year`, and `Watched Date` fields
- Filters out entries with empty dates
- Orders results by date in descending order (most recent first)
- Outputs JSON directly to files in the temporary directory

**SQL operations:**
```sql
-- Import CSV files
.import ./tmp/watchlist.csv Watchlist
.import ./tmp/diary.csv Diary

-- Export to JSON with field mapping
select Name as name, Year as year, Date as date_updated 
from Watchlist where Date != "" order by Date desc;
```

## Supporting Files

### `prompts/tag-content.md`
Comprehensive prompt template for the AI tagging system with examples and taxonomy.

**What it contains:**
- Role definition for the AI as a content strategist and librarian
- Detailed task instructions for content analysis and tag generation
- Constraints for prioritizing existing taxonomy over novel tags
- Complete existing taxonomy with usage counts (e.g., "london (554)", "travel (274)")
- JSON output format specification with four categories:
  - `description` - Brief image description (if image provided)
  - `existing` - Tags already present in the content
  - `new` - Suggested tags from existing taxonomy
  - `novel` - New tags (max 2, only when necessary)
- Few-shot learning examples for different content types
- Template placeholder for content injection

### `note-mapping.json`
Generated mapping file for note renaming operations (created by `create-note-mapping.py`).

**Structure:**
```json
{
  "original-filename.md": {
    "new_filename": "2025-07-19-descriptive-slug.md",
    "title": "The note title from frontmatter",
    "date": "2025-07-19",
    "slug": "descriptive-slug",
    "needs_rename": true
  }
}
```

**Purpose:**
- Documents all proposed filename changes before execution
- Allows for review and verification of rename operations
- Serves as a backup reference for what changes were made

## Script Architecture & Patterns

### Error Handling
All bash scripts use `set -euo pipefail` for robust error handling:
- `set -e` - Exit immediately if any command exits with non-zero status
- `set -u` - Treat unset variables as errors
- `set -o pipefail` - Pipeline fails if any command in pipeline fails

### Working Directory
- Scripts are designed to work from the project root directory
- File paths are relative to the project root (`./content/`, `./static/`)
- Scripts change directory when needed (e.g., `rename-notes.sh`)

### Safety Features
- Input validation and argument checking
- Dependency verification before execution
- Temporary file handling with cleanup
- Preview/dry-run capabilities where applicable
- Confirmation prompts for destructive operations

## Dependencies

### System Requirements
```bash
# Core utilities (usually pre-installed)
bash                    # Shell scripting
sqlite3                 # Database operations

# Media processing
brew install exiftool   # EXIF data extraction
brew install imagemagick # Image processing and resizing

# Development tools
brew install jq         # JSON processing (optional for some scripts)
go install github.com/jackreid/cover@latest  # Book data management
```

### Python Environment
```bash
# Python 3.13+ with uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh
cd scripts/tag-content-env
uv sync
```

**Python Dependencies (managed by uv):**
- `google-generativeai>=0.8.5` - Gemini API client
- `python-frontmatter>=1.1.0` - YAML frontmatter parsing
- `pyyaml>=6.0.2` - YAML processing
- `rich>=14.0.0` - Rich terminal UI
- `rich-pixels>=3.0.1` - Rich image support
- `typer>=0.16.0` - CLI framework

### API Requirements
- **Google Gemini API key** - For AI-powered content tagging
- **Hardcover API key** - For book data synchronization
- **Letterboxd account** - For film data exports (manual download required)

## Common Workflows

### Setting up a new blog post
```bash
./scripts/new-post.sh
# Follow prompts, edit in vim
```

### Adding a photo with metadata
```bash
./scripts/new-photo.sh ~/Downloads/vacation-photo.jpg
# Follow prompts for metadata
```

### Updating media data
```bash
# Update books (requires cover CLI and API key)
./scripts/update-books.sh

# Update films (requires Letterboxd export)
./scripts/update-film.sh ~/Downloads/letterboxd-export/
```

### Content organization and cleanup
```bash
# Ensure photo files have date prefixes
./scripts/date-photo.sh

# Generate note renaming plan
python3 scripts/create-note-mapping.py
# Review scripts/note-mapping.json
./scripts/rename-notes.sh
```

### AI-powered content tagging
```bash
# Set up environment
export GEMINI_API_KEY="your-api-key"

# Tag different content types
./scripts/tag-content.sh text "Blog post content here"
./scripts/tag-content.sh file content/post/2025-07-19-my-post.md
./scripts/tag-content.sh image static/img/photo/sunset.jpg
``` 