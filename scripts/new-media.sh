#!/bin/bash
set -euo pipefail

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BOOKS_JSON="$PROJECT_ROOT/data/books/read.json"
MOVIES_JSON="$PROJECT_ROOT/data/films/watched.json"
POSTS_DIR="$PROJECT_ROOT/content/post"

# Function to generate slug from text
slugify() {
	echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | sed 's/ /-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-50
}

# Function to check if a post exists for a given slug pattern (checks all dates)
# Returns the next number to use (0 if none exist, 1+ if duplicates exist)
post_exists() {
	local base_slug="$1"
	
	# Check for exact match (no number suffix) across all dates
	local has_exact=0
	for file in "$POSTS_DIR"/*-"$base_slug".md; do
		if [ -f "$file" ]; then
			has_exact=1
			break
		fi
	done
	
	# Find the highest numbered variant
	local max_num=0
	for file in "$POSTS_DIR"/*-"$base_slug"-[0-9]*.md; do
		if [ -f "$file" ]; then
			# Extract the number from filename (format: YYYY-MM-DD-base-slug-N.md)
			local filename=$(basename "$file" .md)
			local num=$(echo "$filename" | sed -n "s/.*-$base_slug-\([0-9]*\)$/\1/p")
			if [ -n "$num" ] && [ "$num" -gt "$max_num" ]; then
				max_num=$num
			fi
		fi
	done
	
	# If exact match exists, next number is max_num + 1
	# If only numbered variants exist, next number is max_num + 1
	# If nothing exists, return 0
	if [ $has_exact -eq 1 ] || [ $max_num -gt 0 ]; then
		echo $((max_num + 1))
	else
		echo "0"
	fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
	echo "Error: jq is required but not installed. Install with: brew install jq"
	exit 1
fi

# Check if fzf is installed
if ! command -v fzf &> /dev/null; then
	echo "Error: fzf is required but not installed. Install with: brew install fzf"
	exit 1
fi

# Ensure posts directory exists
mkdir -p "$POSTS_DIR"

# Parse books and create selection list
books_list=""
if [ -f "$BOOKS_JSON" ]; then
	books_list=$(jq -r '.[] | "BOOK|\(.date_updated)|\(.title)|\(.author // "Unknown")|\(.image_url // "")"' "$BOOKS_JSON" 2>/dev/null || echo "")
fi

# Parse movies and create selection list
movies_list=""
if [ -f "$MOVIES_JSON" ]; then
	movies_list=$(jq -r '.[] | "MOVIE|\(.date_updated)|\(.name)|\(.year // "")|"' "$MOVIES_JSON" 2>/dev/null || echo "")
fi

# Check if we have any items to display
if [ -z "$books_list" ] && [ -z "$movies_list" ]; then
	echo "No books or movies found in data files."
	exit 1
fi

# Combine and sort by date (most recent first)
combined_list=$(echo -e "$books_list\n$movies_list" | sort -t'|' -k2 -r)

# Create fzf display format with checkmarks
fzf_input=""
while IFS='|' read -r type date title author_or_year image_url; do
	# Generate base slug
	if [ "$type" = "BOOK" ]; then
		title_slug=$(slugify "$title")
		author_slug=$(slugify "$author_or_year")
		base_slug="read-$title_slug-$author_slug"
		display_title="$title by $author_or_year"
	else
		title_slug=$(slugify "$title")
		if [ -n "$author_or_year" ]; then
			base_slug="watched-$title_slug-$author_or_year"
			display_title="$title ($author_or_year)"
		else
			base_slug="watched-$title_slug"
			display_title="$title"
		fi
	fi
	
	# Check if post exists (check across all dates)
	existing=$(post_exists "$base_slug")
	
	# Format display with checkmark
	if [ "$existing" != "0" ]; then
		checkmark="✓"
	else
		checkmark=" "
	fi
	
	# Format display title with type indicator
	if [ "$type" = "BOOK" ]; then
		display_line="$checkmark 📚 $display_title"
	else
		display_line="$checkmark 🎬 $display_title"
	fi
	
	# Store for fzf: checkmark|type|date|title|author_or_year|image_url|base_slug|display_line
	fzf_input+="$checkmark|$type|$date|$title|$author_or_year|$image_url|$base_slug|$display_line"$'\n'
done <<< "$combined_list"

# Present in fzf
# Display: checkmark and formatted title with emoji, date
selected=$(echo "$fzf_input" | fzf --delimiter='|' --with-nth=8,3 --preview='echo "Type: {2} | Date: {3}"' --preview-window=down:1 --header="[ENTER] Select media to log | ✓ = already logged" || true)

if [ -z "$selected" ]; then
	echo "No selection made."
	exit 0
fi

# Parse selection
IFS='|' read -r checkmark type date title author_or_year image_url base_slug display_line <<< "$selected"

# Determine if this is a duplicate
existing=$(post_exists "$base_slug")
duplicate_count=0

# If post exists, we need to create a numbered variant
# The date should be from the source data (already set), but we need the next number
if [ "$existing" != "0" ]; then
	duplicate_count=$existing
fi

# Generate final slug
if [ $duplicate_count -gt 0 ]; then
	final_slug="$base_slug-$duplicate_count"
else
	final_slug="$base_slug"
fi

# Generate post content
if [ "$type" = "BOOK" ]; then
	# Book post
	post_title="$title by $author_or_year"
	book_author="$author_or_year"
	movie_released=""
	media_image="$image_url"
else
	# Movie post
	if [ -n "$author_or_year" ]; then
		post_title="$title ($author_or_year)"
		movie_released="$author_or_year"
	else
		post_title="$title"
		movie_released=""
	fi
	book_author=""
	media_image="" # TODO: Add TMDB integration if needed
fi

# Create frontmatter
frontmatter="---"
frontmatter+=$'\n'"title: \"$post_title\""
frontmatter+=$'\n'"slug: $final_slug"
frontmatter+=$'\n'"date: $date"
frontmatter+=$'\n'"tags:"
frontmatter+=$'\n'"  - medialog"
if [ "$type" = "BOOK" ]; then
	frontmatter+=$'\n'"  - readbook"
	frontmatter+=$'\n'"book_author: \"$book_author\""
else
	frontmatter+=$'\n'"  - watchedmovie"
	if [ -n "$movie_released" ]; then
		frontmatter+=$'\n'"movie_released: $movie_released"
	fi
fi
if [ -n "$media_image" ]; then
	frontmatter+=$'\n'"media_image: \"$media_image\""
fi
frontmatter+=$'\n'"rating: 0"
frontmatter+=$'\n'"---"
frontmatter+=$'\n'

# Write post file
post_path="$POSTS_DIR/$date-$final_slug.md"
echo "$frontmatter" > "$post_path"

# Open in vim
vim "$post_path"

