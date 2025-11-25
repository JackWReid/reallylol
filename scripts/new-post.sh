#!/bin/bash
set -euo pipefail

# Script to create a new blog post
# Prompts for slug and title, then creates a post file with frontmatter

# Get user input
read -p "Slug: " slug
read -p "Title: " title

# Validate input
if [ -z "$slug" ]; then
	echo "Error: Slug cannot be empty"
	exit 1
fi

if [ -z "$title" ]; then
	echo "Error: Title cannot be empty"
	exit 1
fi

# Generate date and file path
date=$(date +"%Y-%m-%d")
md_path="./content/post/$date-$slug.md"

# Ensure content/post directory exists
mkdir -p "./content/post"

# Create frontmatter template
md_template=$(
	cat <<EOF
---
title: "$title"
date: $date
tags:
  - journal
---

EOF
)

# Write template to file
echo "$md_template" > "$md_path"

# Open in editor
vim "$md_path"
