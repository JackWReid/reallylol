#!/bin/bash
set -euo pipefail

read -p "Slug: " slug
read -p "Title: " title

date=$(date +"%Y-%m-%d")
md_path="./content/post/$date-$slug.md"

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

echo "$md_template" >$md_path
vim $md_path
