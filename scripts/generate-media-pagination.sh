#!/bin/bash
# Generate pagination pages for media sections
# This script creates _index.md files for each pagination page

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Configuration
PER_PAGE=20

# Function to count items in a JSON array file
count_items() {
    local file="$1"
    if [ ! -f "$file" ]; then
        echo 0
        return
    fi
    # Count array items (rough estimate - count of opening braces for objects)
    jq 'length' "$file" 2>/dev/null || echo 0
}

# Function to calculate total pages
calculate_pages() {
    local count="$1"
    local per_page="$2"
    if [ "$count" -eq 0 ]; then
        echo 0
    else
        echo $(( (count + per_page - 1) / per_page ))
    fi
}

# Function to generate pagination pages for a section
generate_pagination_pages() {
    local section_dir="$1"
    local data_file="$2"
    local base_url="$3"
    
    if [ ! -f "$data_file" ]; then
        echo "Warning: Data file $data_file not found, skipping $section_dir"
        return
    fi
    
    local count=$(count_items "$data_file")
    local total_pages=$(calculate_pages "$count" "$PER_PAGE")
    
    echo "Generating pagination for $section_dir: $count items, $total_pages pages"
    
    # Read the base _index.md content
    local base_index="$section_dir/_index.md"
    if [ ! -f "$base_index" ]; then
        echo "Warning: Base index file $base_index not found, skipping"
        return
    fi
    
    # Extract frontmatter and content
    local frontmatter_end=$(grep -n '^---$' "$base_index" | sed -n '2p' | cut -d: -f1)
    local frontmatter=$(head -n "$frontmatter_end" "$base_index")
    local content=$(tail -n +$((frontmatter_end + 1)) "$base_index")
    
    # Create page directories and _index.md files for pages 2+
    for ((page=2; page<=total_pages; page++)); do
        local page_dir="$section_dir/page/$page"
        mkdir -p "$page_dir"
        
        # Create _index.md with same content as base, but different URL
        local page_url="$base_url/page/$page"
        
        # Update the URL in frontmatter
        local updated_frontmatter=$(echo "$frontmatter" | sed "s|^url:.*|url: \"$page_url\"|")
        
        cat > "$page_dir/_index.md" <<EOF
$updated_frontmatter
$content
EOF
    done
}

# Generate pagination for books
if [ -d "content/books/read" ]; then
    generate_pagination_pages "content/books/read" "data/books/read.json" "/books/read"
fi

if [ -d "content/books/toread" ]; then
    generate_pagination_pages "content/books/toread" "data/books/toread.json" "/books/toread"
fi

if [ -d "content/books/reading" ]; then
    generate_pagination_pages "content/books/reading" "data/books/reading.json" "/books/reading"
fi

# Generate pagination for films
if [ -d "content/films/watched" ]; then
    generate_pagination_pages "content/films/watched" "data/films/watched.json" "/films/watched"
fi

if [ -d "content/films/towatch" ]; then
    generate_pagination_pages "content/films/towatch" "data/films/towatch.json" "/films/towatch"
fi

echo "Pagination pages generated successfully!"
