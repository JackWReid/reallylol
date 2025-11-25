#!/bin/bash
set -euo pipefail

# Script to create a new photo post
# Requires: image path as argument
# Extracts EXIF data, prompts for metadata, processes image, and creates post file

# Check for required argument
if [ -z "${1:-}" ]; then
	echo "Usage: ./scripts/new-photo.sh path/to/photo.jpg"
	exit 1
fi

# Check if source file exists
if [ ! -f "$1" ]; then
	echo "Error: File not found: $1"
	exit 1
fi

# Check for required tools
if ! command -v exiftool &> /dev/null; then
	echo "Error: exiftool is required but not installed. Install with: brew install exiftool"
	exit 1
fi

if ! command -v mogrify &> /dev/null; then
	echo "Error: mogrify (ImageMagick) is required but not installed. Install with: brew install imagemagick"
	exit 1
fi

# Extract creation date from EXIF data
creation_datetime=$(exiftool -d "%Y-%m-%dT%H:%M:%S" -DateTimeOriginal -s3 "$1")
creation_date=$(exiftool -d "%Y-%m-%d" -DateTimeOriginal -s3 "$1")

# Validate date extraction
if [ -z "$creation_date" ]; then
	echo "Error: Failed to extract the creation date from the EXIF data."
	echo "Make sure the image file has valid EXIF metadata."
	exit 1
fi

# Get user input for post metadata
read -p "Slug: " slug
read -p "Title: " title
read -p "Location: " location
read -p "Tags [comma separated]: " tags
read -p "Alt text: " alt_text

# Validate required fields
if [ -z "$slug" ]; then
	echo "Error: Slug cannot be empty"
	exit 1
fi

if [ -z "$title" ]; then
	echo "Error: Title cannot be empty"
	exit 1
fi

# Set up file paths
img_path="./static/img/photo/$creation_date-$slug.jpg"
md_path="./content/photo/$creation_date-$slug.md"
abs_img_path="/img/photo/$creation_date-$slug.jpg"

# Ensure directories exist
mkdir -p "./static/img/photo"
mkdir -p "./content/photo"

# Copy and transform the image file
# Resize to max 1400x1400 while maintaining aspect ratio, convert to JPG
cp "$1" "$img_path"
mogrify -quiet -format jpg -layers Dispose -resize 1400\>x1400\> -quality 100% "$img_path"

# Split tags and format as YAML list
formatted_tags=""
if [ -n "$tags" ]; then
	IFS=',' read -ra tag_array <<< "$tags"
	for tag in "${tag_array[@]}"; do
		# Trim whitespace from each tag
		trimmed_tag=$(echo "$tag" | xargs)
		if [ -n "$trimmed_tag" ]; then
			formatted_tags="$formatted_tags  - $trimmed_tag"$'\n'
		fi
	done
fi

# Create frontmatter template
md_template=$(cat <<EOF
---
title: "$title"
date: $creation_datetime
image: "$abs_img_path"
location: $location
tags:
$formatted_tags---

![$alt_text]($abs_img_path)
EOF
)

# Write template to file
echo "$md_template" > "$md_path"

echo "Created photo post: $md_path"
