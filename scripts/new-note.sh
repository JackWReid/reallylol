#!/bin/bash
set -euo pipefail

read -p "Note: " note

date_time=$(date +"%Y-%m-%dT%H:%M:%S")
md_path="./content/note/$date_time.md"

md_template=$(cat <<EOF
---
title: "$note"
date: $date_time
---
EOF
)

echo "$md_template"
echo "$md_template" > $md_path
