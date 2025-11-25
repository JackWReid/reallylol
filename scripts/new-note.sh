#!/bin/bash
set -euo pipefail

# Script to create a new note post
# Prompts for note text, auto-generates slug, and creates a note file

# Get user input
read -p "Note: " note

# Validate input
if [ -z "$note" ]; then
	echo "Error: Note cannot be empty"
	exit 1
fi

# Generate slug from note title
# Convert to lowercase, remove non-alphanumeric chars, replace spaces with dashes
slug=$(echo "$note" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | sed 's/ /-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-50)

# If slug is empty after processing, use "untitled"
if [ -z "$slug" ]; then
	slug="untitled"
fi

# Generate date strings
date_only=$(date +"%Y-%m-%d")
date_time=$(date +"%Y-%m-%dT%H:%M:%S")
md_path="./content/note/$date_only-$slug.md"

# Ensure content/note directory exists
mkdir -p "./content/note"

# Create frontmatter template
md_template=$(cat <<EOF
---
title: "$note"
date: $date_time
---
EOF
)

# Write template to file
echo "$md_template" > "$md_path"
