#!/bin/bash
set -euo pipefail

read -p "Note: " note

# Generate slug from note title
slug=$(echo "$note" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | sed 's/ /-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-50)

# If slug is empty, use "untitled"
if [ -z "$slug" ]; then
    slug="untitled"
fi

date_only=$(date +"%Y-%m-%d")
date_time=$(date +"%Y-%m-%dT%H:%M:%S")
md_path="./content/note/$date_only-$slug.md"

md_template=$(cat <<EOF
---
title: "$note"
date: $date_time
---
EOF
)

echo "$md_template"
echo "$md_template" > $md_path
