#!/bin/bash

# Script to check all image references in markdown files

echo "Checking image references in markdown files..."
echo ""

# Find all markdown files
markdown_files=$(find content -name "*.md" -type f)

broken_refs=0
total_refs=0
unique_patterns=()

# Function to check if image exists
check_image() {
    local img_path=$1
    local full_path=""
    
    # Remove leading slash if present
    img_path=${img_path#/}
    
    # Check various possible locations
    if [[ "$img_path" == "img/"* ]]; then
        # Image should be in static/img/
        full_path="static/$img_path"
    elif [[ "$img_path" == "images/"* ]]; then
        # Image might be in static/images/
        full_path="static/$img_path"
    elif [[ "$img_path" == "static/"* ]]; then
        # Already has static prefix
        full_path="$img_path"
    elif [[ "$img_path" == "http://"* ]] || [[ "$img_path" == "https://"* ]]; then
        # External URL, skip
        return 0
    else
        # Try static directory
        full_path="static/$img_path"
    fi
    
    if [ ! -f "$full_path" ]; then
        return 1
    fi
    return 0
}

# Extract image references from markdown files
for file in $markdown_files; do
    # Find image references in various formats
    # Format 1: ![alt](path)
    # Format 2: {{<photo src="path" ...>}}
    # Format 3: <img src="path" ...>
    
    # Extract markdown image syntax
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            total_refs=$((total_refs + 1))
            if ! check_image "$line"; then
                echo "❌ BROKEN: $line"
                echo "   in file: $file"
                echo ""
                broken_refs=$((broken_refs + 1))
            fi
        fi
    done < <(grep -oE '!\[.*?\]\(([^)]+)\)' "$file" | sed -E 's/!\[.*?\]\(([^)]+)\)/\1/')
    
    # Extract Hugo shortcode photo syntax
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            total_refs=$((total_refs + 1))
            if ! check_image "$line"; then
                echo "❌ BROKEN: $line"
                echo "   in file: $file"
                echo ""
                broken_refs=$((broken_refs + 1))
            fi
        fi
    done < <(grep -oE '{{<photo src="([^"]+)"' "$file" | sed -E 's/{{<photo src="([^"]+)"/\1/')
    
    # Extract HTML img syntax
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            total_refs=$((total_refs + 1))
            if ! check_image "$line"; then
                echo "❌ BROKEN: $line"
                echo "   in file: $file"
                echo ""
                broken_refs=$((broken_refs + 1))
            fi
        fi
    done < <(grep -oE '<img src="([^"]+)"' "$file" | sed -E 's/<img src="([^"]+)"/\1/')
done

# Check for unusual image storage patterns
echo "Checking for unusual image storage patterns..."
echo ""

# Find all unique image path patterns
all_patterns=$(find content -name "*.md" -type f -exec grep -hEo '(!\[.*?\]\([^)]+\)|{{<photo src="[^"]+"|\<img src="[^"]+")' {} \; | \
    sed -E 's/!\[.*?\]\(([^)]+)\)/\1/; s/{{<photo src="([^"]+)"/\1/; s/<img src="([^"]+)"/\1/' | \
    grep -v "^http" | \
    sed -E 's|^/||; s|/[^/]+\.(jpg|jpeg|png|gif|webp)$|/|' | \
    sort -u)

echo "Image path patterns found:"
echo "$all_patterns" | while IFS= read -r pattern; do
    if [[ -n "$pattern" ]]; then
        count=$(find content -name "*.md" -type f -exec grep -hEo "(!\[.*?\]\($pattern|{{<photo src=\"$pattern|<img src=\"$pattern)" {} \; | wc -l)
        echo "  $pattern (used $count times)"
    fi
done

echo ""
echo "Summary:"
echo "- Total image references: $total_refs"
echo "- Broken references: $broken_refs"
echo "- Success rate: $(( (total_refs - broken_refs) * 100 / total_refs ))%"

if [ $broken_refs -gt 0 ]; then
    echo ""
    echo "⚠️  Found $broken_refs broken image references that need to be fixed!"
    exit 1
else
    echo ""
    echo "✅ All image references are valid!"
fi