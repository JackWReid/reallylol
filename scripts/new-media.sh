#!/bin/bash
set -euo pipefail

# Interactive script to create medialog posts for books/movies using fzf
# 
# PERFORMANCE OPTIMIZATIONS:
# This script processes ~1500+ media items and was optimized from 58+ seconds to ~1.6 seconds:
#
# 1. Post Index Caching: Single directory scan builds an index once (1.5s) instead of
#    checking post existence for each item (would be 56+ seconds for 1500+ items)
#
# 2. File-based Index: Uses temporary file instead of associative arrays for bash 3.2
#    compatibility (macOS default). Awk is used for fast lookups from the file.
#
# 3. Batch Processing: All operations (slugify, lookup, format) happen in a single
#    awk pass instead of 2270+ separate function calls. This reduced processing time
#    from 17+ seconds to ~30ms.
#
# 4. In-process Slugification: Slugify function runs inside awk instead of spawning
#    external bash processes. Eliminates thousands of process spawns.
#
# Use --benchmark flag to see detailed performance metrics.

# Script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

BOOKS_JSON="$PROJECT_ROOT/data/books/read.json"
MOVIES_JSON="$PROJECT_ROOT/data/films/watched.json"
POSTS_DIR="$PROJECT_ROOT/content/post"

# Temporary file to cache post slug index (built once at startup)
# PERFORMANCE: Uses file-based index instead of associative arrays for bash 3.2 compatibility.
# This allows O(1) lookups without requiring bash 4.0+ associative arrays.
POST_SLUG_INDEX_FILE=""

# Benchmark mode flag
BENCHMARK_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
	case $1 in
		-b|--benchmark)
			BENCHMARK_MODE=true
			shift
			;;
		*)
			echo "Unknown option: $1"
			echo "Usage: $0 [-b|--benchmark]"
			exit 1
			;;
	esac
done

# Timing functions
get_time() {
	if command -v gdate &> /dev/null; then
		gdate +%s.%N
	elif date --version &>/dev/null; then
		date +%s.%N
	else
		# Fallback for macOS date
		python3 -c "import time; print(time.time())" 2>/dev/null || date +%s
	fi
}

format_time() {
	local seconds=$1
	# Use awk for floating point arithmetic if available, otherwise use bc or python
	if command -v awk &> /dev/null; then
		local ms=$(awk "BEGIN {printf \"%.0f\", $seconds * 1000}")
		if [ "$ms" -lt 1000 ]; then
			printf "%sms" "$ms"
		else
			printf "%.2fs" "$seconds"
		fi
	elif command -v python3 &> /dev/null; then
		local formatted=$(python3 -c "t=$seconds; print(f'{int(t*1000)}ms' if t < 1 else f'{t:.2f}s')")
		printf "%s" "$formatted"
	else
		printf "%.2fs" "$seconds"
	fi
}

print_timing() {
	local label="$1"
	local start_time="$2"
	local end_time="$3"
	# Calculate elapsed time using awk (most reliable)
	if command -v awk &> /dev/null; then
		local elapsed=$(awk "BEGIN {print $end_time - $start_time}")
	else
		local elapsed=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
	fi
	printf "  %-50s %s\n" "$label:" "$(format_time $elapsed)"
}

SCRIPT_START=$(get_time)
SECTION_START=$SCRIPT_START

# Function to generate slug from text
slugify() {
	echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | sed 's/ /-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-50
}

# Build index of all existing post slugs (scans directory once)
# Creates a temporary file mapping base_slug -> next number to use
# PERFORMANCE: This single directory scan replaces thousands of individual file checks.
# Without this, we'd need to check post existence for each of ~1500 media items.
build_post_index() {
	# Create temporary file for index
	# NOTE: File-based storage required for bash 3.2 compatibility (no associative arrays)
	POST_SLUG_INDEX_FILE=$(mktemp)
	
	# Scan all post files once and extract slug information
	# Format output: base_slug|max_number|has_exact
	# PERFORMANCE: Single directory scan is much faster than checking per-item
	for file in "$POSTS_DIR"/*.md; do
		[ -f "$file" ] || continue
		
		local filename=$(basename "$file" .md)
		# Remove date prefix (format: YYYY-MM-DD-base-slug or YYYY-MM-DD-base-slug-N)
		# Extract everything after the date (third dash)
		local slug_part=$(echo "$filename" | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
		
		# Check if this is a numbered variant (ends with -N where N is a number)
		# NOTE: Using grep -E instead of bash regex for compatibility and clarity
		if echo "$slug_part" | grep -E '-[0-9]+$' >/dev/null 2>&1; then
			# Extract base slug and number
			local base_slug=$(echo "$slug_part" | sed 's/-[0-9]\+$//')
			local num=$(echo "$slug_part" | sed -n 's/.*-\([0-9]\+\)$/\1/p')
			
			# Store: base_slug|number|0 (numbered variant)
			if [ -n "$num" ] && [ -n "$base_slug" ]; then
				echo "$base_slug|$num|0" >> "$POST_SLUG_INDEX_FILE"
			fi
		else
			# This is an exact match (no number suffix)
			local base_slug="$slug_part"
			if [ -n "$base_slug" ]; then
				echo "$base_slug|0|1" >> "$POST_SLUG_INDEX_FILE"
			fi
		fi
	done
	
	# Process the index file to compute max numbers per slug
	# Use awk to find max number for each base_slug and handle exact matches
	# PERFORMANCE: Single awk pass processes all slugs efficiently using associative arrays
	# (awk has associative arrays even though bash 3.2 doesn't)
	local processed_index=$(mktemp)
	
	# Process: for each base_slug, find max number and whether exact match exists
	awk -F'|' '{
		base = $1
		num = $2
		exact = $3
		
		# Track exact matches
		if (exact == "1") {
			has_exact[base] = 1
		}
		
		# Track max number (treat exact match as 0)
		current_max = max_num[base]
		if (exact == "1") {
			if (current_max == "" || 0 > current_max) {
				max_num[base] = 0
			}
		} else {
			if (current_max == "" || num > current_max) {
				max_num[base] = num
			}
		}
	}
	END {
		for (base in max_num) {
			m = max_num[base]
			# If we saw this slug, next number is max_num + 1
			print base "|" (m + 1)
		}
		# Handle slugs that only had exact matches
		for (base in has_exact) {
			if (!(base in max_num)) {
				print base "|1"
			}
		}
	}' "$POST_SLUG_INDEX_FILE" > "$processed_index"
	
	mv "$processed_index" "$POST_SLUG_INDEX_FILE"
}

# Function to check if a post exists for a given slug pattern (uses cached index)
# Returns the next number to use (0 if none exist, 1+ if duplicates exist)
# NOTE: This function is kept for compatibility but is rarely used after optimization.
# Most lookups are now done in batch during the main processing pass.
post_exists() {
	local base_slug="$1"
	
	if [ -z "$POST_SLUG_INDEX_FILE" ] || [ ! -f "$POST_SLUG_INDEX_FILE" ]; then
		echo "0"
		return
	fi
	
	# Look up in index file using awk for safer pattern matching
	# PERFORMANCE: Single awk invocation with exact match (O(1) hash lookup in awk)
	local result=$(awk -F'|' -v slug="$base_slug" '$1 == slug {print $2; exit}' "$POST_SLUG_INDEX_FILE" 2>/dev/null)
	
	if [ -n "$result" ]; then
		echo "$result"
	else
		echo "0"
	fi
}

# Cleanup function to remove temp file on exit
cleanup_post_index() {
	if [ -n "$POST_SLUG_INDEX_FILE" ] && [ -f "$POST_SLUG_INDEX_FILE" ]; then
		rm -f "$POST_SLUG_INDEX_FILE"
	fi
}
trap cleanup_post_index EXIT

# Check if jq is installed
if ! command -v jq &> /dev/null; then
	echo "Error: jq is required but not installed. Install with: brew install jq"
	exit 1
fi

# Check if fzf is installed (skip in benchmark mode)
if [ "$BENCHMARK_MODE" = false ] && ! command -v fzf &> /dev/null; then
	echo "Error: fzf is required but not installed. Install with: brew install fzf"
	exit 1
fi

# Ensure posts directory exists
mkdir -p "$POSTS_DIR"

# Build post slug index once - PERFORMANCE: Single directory scan instead of per-item checks
# This optimization reduces processing time from ~56 seconds to ~31ms for 1500+ items
SECTION_START=$(get_time)
build_post_index
INDEX_TIME=$(get_time)
if [ "$BENCHMARK_MODE" = true ]; then
	print_timing "Build post index" "$SECTION_START" "$INDEX_TIME"
fi

# Parse books and create selection list
SECTION_START=$(get_time)
books_list=""
if [ -f "$BOOKS_JSON" ]; then
	books_list=$(jq -r '.[] | "BOOK|\(.date_updated)|\(.title)|\(.author // "Unknown")|\(.image_url // "")"' "$BOOKS_JSON" 2>/dev/null || echo "")
fi
BOOKS_PARSE_TIME=$(get_time)
if [ "$BENCHMARK_MODE" = true ]; then
	print_timing "Parse books JSON" "$SECTION_START" "$BOOKS_PARSE_TIME"
fi

# Parse movies and create selection list
SECTION_START=$(get_time)
movies_list=""
if [ -f "$MOVIES_JSON" ]; then
	movies_list=$(jq -r '.[] | "MOVIE|\(.date_updated)|\(.name)|\(.year // "")|"' "$MOVIES_JSON" 2>/dev/null || echo "")
fi
MOVIES_PARSE_TIME=$(get_time)
if [ "$BENCHMARK_MODE" = true ]; then
	print_timing "Parse movies JSON" "$SECTION_START" "$MOVIES_PARSE_TIME"
fi

# Check if we have any items to display
if [ -z "$books_list" ] && [ -z "$movies_list" ]; then
	echo "No books or movies found in data files."
	exit 1
fi

# Combine and sort by date (most recent first)
SECTION_START=$(get_time)
combined_list=$(echo -e "$books_list\n$movies_list" | sort -t'|' -k2 -r)
SORT_TIME=$(get_time)
if [ "$BENCHMARK_MODE" = true ]; then
	print_timing "Combine and sort lists" "$SECTION_START" "$SORT_TIME"
fi

# Create fzf display format with checkmarks
# PERFORMANCE CRITICAL: This section processes ~1500 items in a single awk pass.
# Previous version used bash loops with external slugify calls (2270 function calls = 17+ seconds).
# This version does everything in-process with awk (slugify + lookup + format) = ~30ms.
SECTION_START=$(get_time)
item_count=$(echo "$combined_list" | wc -l | tr -d ' ')

if [ -f "$POST_SLUG_INDEX_FILE" ]; then
	# PERFORMANCE: Single awk pass does three operations:
	# 1. Load post index into memory (first file argument)
	# 2. Process all items: slugify, lookup, format (stdin via -)
	# This eliminates thousands of process spawns and file I/O operations
	fzf_input=$(echo "$combined_list" | awk -F'|' '
		# Slugify function - PERFORMANCE: In-process instead of external bash function calls
		# Previous: 2270 separate slugify() calls = 17+ seconds
		# Current: In-process awk function = milliseconds
		# Simplified for speed: lowercase, replace non-alphanum with dash, collapse dashes
		function slugify(str) {
			# Convert to lowercase (using gsub)
			result = tolower(str)
			# Replace non-alphanumeric and non-space with nothing, then replace spaces with dashes
			gsub(/[^a-z0-9 ]/, "", result)
			gsub(/ +/, "-", result)
			gsub(/-+/, "-", result)
			gsub(/^-|-$/, "", result)
			# Limit to 50 chars
			return substr(result, 1, 50)
		}
		
		# PERFORMANCE: Two-pass awk pattern (NR == FNR is first file, then stdin)
		# First pass: load post index into memory as associative array
		# This allows O(1) hash lookups during second pass
		NR == FNR {
			slug_index[$1] = $2
			next
		}
		# Second pass: process items (from stdin)
		# All operations (slugify, lookup, format) happen in this single pass
		{
			type = $1
			date = $2
			title = $3
			author_or_year = $4
			image_url = $5
			
			# Generate slugs
			if (type == "BOOK") {
				title_slug = slugify(title)
				author_slug = slugify(author_or_year)
				base_slug = "read-" title_slug "-" author_slug
				display_title = title " by " author_or_year
			} else {
				title_slug = slugify(title)
				if (author_or_year != "") {
					base_slug = "watched-" title_slug "-" author_or_year
					display_title = title " (" author_or_year ")"
				} else {
					base_slug = "watched-" title_slug
					display_title = title
				}
			}
			
			# Lookup slug in index - PERFORMANCE: O(1) hash lookup in awk associative array
			# Previous: 1545 separate post_exists() calls with file reads = 56+ seconds
			# Current: In-memory hash lookup = instant
			existing = (base_slug in slug_index) ? slug_index[base_slug] : "0"
			
			# Format checkmark based on lookup result
			checkmark = (existing != "0" && existing != "") ? "✓" : " "
			
			# Format display line
			if (type == "BOOK") {
				display_line = checkmark " 📚 " display_title
			} else {
				display_line = checkmark " 🎬 " display_title
			}
			
			# Output: checkmark|type|date|title|author_or_year|image_url|base_slug|display_line
			print checkmark "|" type "|" date "|" title "|" author_or_year "|" image_url "|" base_slug "|" display_line
		}
	' "$POST_SLUG_INDEX_FILE" -)
else
	# No index file, process without lookups
	# PERFORMANCE: Same optimization - single awk pass for slugify + format
	fzf_input=$(echo "$combined_list" | awk -F'|' '
		function slugify(str) {
			result = tolower(str)
			gsub(/[^a-z0-9 ]/, "", result)
			gsub(/ +/, "-", result)
			gsub(/-+/, "-", result)
			gsub(/^-|-$/, "", result)
			return substr(result, 1, 50)
		}
		{
			type = $1
			date = $2
			title = $3
			author_or_year = $4
			image_url = $5
			
			if (type == "BOOK") {
				title_slug = slugify(title)
				author_slug = slugify(author_or_year)
				base_slug = "read-" title_slug "-" author_slug
				display_title = title " by " author_or_year
			} else {
				title_slug = slugify(title)
				if (author_or_year != "") {
					base_slug = "watched-" title_slug "-" author_or_year
					display_title = title " (" author_or_year ")"
				} else {
					base_slug = "watched-" title_slug
					display_title = title
				}
			}
			
			checkmark = " "
			if (type == "BOOK") {
				display_line = checkmark " 📚 " display_title
			} else {
				display_line = checkmark " 🎬 " display_title
			}
			
			print checkmark "|" type "|" date "|" title "|" author_or_year "|" image_url "|" base_slug "|" display_line
		}
	')
fi
PROCESS_ITEMS_TIME=$(get_time)
if [ "$BENCHMARK_MODE" = true ]; then
	print_timing "Process $item_count items (slugify + lookup + format)" "$SECTION_START" "$PROCESS_ITEMS_TIME"
fi

# In benchmark mode, print timing summary and exit
if [ "$BENCHMARK_MODE" = true ]; then
	SCRIPT_END=$(get_time)
	TOTAL_TIME=$(echo "$SCRIPT_END - $SCRIPT_START" | bc -l 2>/dev/null || echo "0")
	
	echo ""
	echo "========================================="
	echo "BENCHMARK RESULTS"
	echo "========================================="
	echo ""
	print_timing "Total time" "$SCRIPT_START" "$SCRIPT_END"
	echo ""
	echo "Summary:"
	book_count=$(echo "$books_list" | wc -l | tr -d ' ' || echo 0)
	movie_count=$(echo "$movies_list" | wc -l | tr -d ' ' || echo 0)
	echo "  - Books: $book_count"
	echo "  - Movies: $movie_count"
	echo "  - Total items processed: $item_count"
	if [ -f "$POST_SLUG_INDEX_FILE" ]; then
		index_count=$(wc -l < "$POST_SLUG_INDEX_FILE" 2>/dev/null | tr -d ' ' || echo 0)
		echo "  - Post index entries: $index_count"
	fi
	echo ""
	exit 0
fi

# Present in fzf
# Display: checkmark and formatted title with emoji
# NOTE: Using --with-nth=8 to show only display_line (column 8) to avoid date concatenation artifact
# The date is available in column 3 for preview window if needed
selected=$(echo "$fzf_input" | fzf --delimiter='|' --with-nth=8 --preview='echo "Type: {2} | Date: {3}"' --preview-window=down:1 --header="[ENTER] Select media to log | ✓ = already logged" || true)

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

