#!/bin/bash

# Script to consolidate images from assets/img to static/img

echo "Starting image consolidation..."

# Check if assets/img exists
if [ ! -d "assets/img" ]; then
    echo "assets/img directory does not exist. Nothing to consolidate."
    exit 0
fi

# Check if static/img exists, create if not
if [ ! -d "static/img" ]; then
    echo "Creating static/img directory..."
    mkdir -p static/img
fi

# Count files to move
file_count=$(find assets/img -type f -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" | wc -l)
echo "Found $file_count image files to move from assets/img to static/img"

# Check for conflicts
echo "Checking for filename conflicts..."
conflicts=0
for file in assets/img/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ -f "static/img/$filename" ]; then
            echo "CONFLICT: $filename exists in both directories"
            # Compare files
            if cmp -s "$file" "static/img/$filename"; then
                echo "  - Files are identical, will skip"
            else
                echo "  - Files are different!"
                conflicts=$((conflicts + 1))
            fi
        fi
    fi
done

if [ $conflicts -gt 0 ]; then
    echo "ERROR: Found $conflicts filename conflicts with different content"
    echo "Please resolve these conflicts manually before proceeding"
    exit 1
fi

# Move files
echo "Moving files from assets/img to static/img..."
moved=0
skipped=0

for file in assets/img/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ -f "static/img/$filename" ]; then
            if cmp -s "$file" "static/img/$filename"; then
                echo "Skipping $filename (identical file already exists)"
                rm "$file"
                skipped=$((skipped + 1))
            fi
        else
            echo "Moving $filename"
            mv "$file" "static/img/"
            moved=$((moved + 1))
        fi
    fi
done

# Check if there are subdirectories in assets/img
if [ -d "assets/img/posters-2023" ] || [ -d "assets/img/posters-2024" ]; then
    echo "Found subdirectories in assets/img..."
    for dir in assets/img/*/; do
        if [ -d "$dir" ]; then
            dirname=$(basename "$dir")
            echo "Moving directory $dirname"
            if [ ! -d "static/img/$dirname" ]; then
                mv "$dir" "static/img/"
            else
                echo "ERROR: Directory static/img/$dirname already exists"
                exit 1
            fi
        fi
    done
fi

# Remove empty assets/img directory
if [ -d "assets/img" ] && [ -z "$(ls -A assets/img)" ]; then
    echo "Removing empty assets/img directory..."
    rmdir assets/img
fi

# Remove empty assets directory if it exists and is empty
if [ -d "assets" ] && [ -z "$(ls -A assets)" ]; then
    echo "Removing empty assets directory..."
    rmdir assets
fi

echo ""
echo "Summary:"
echo "- Moved: $moved files"
echo "- Skipped: $skipped identical files"
echo "- Total processed: $((moved + skipped)) files"

# Check for any remaining inconsistencies
echo ""
echo "Checking for other image storage locations..."

# Look for images in other directories
other_images=$(find . -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" \) \
    -not -path "./static/img/*" \
    -not -path "./.git/*" \
    -not -path "./themes/*" \
    -not -path "./public/*" \
    -not -path "./resources/*" \
    2>/dev/null | grep -v "^\./assets/img/")

if [ -n "$other_images" ]; then
    echo "Found images in other locations:"
    echo "$other_images"
else
    echo "All images are now consolidated in static/img/"
fi

echo ""
echo "Image consolidation complete!"