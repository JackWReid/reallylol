#!/bin/bash
set -euo pipefail

if [ -z "$1" ]; then
	echo "Usage: ./scripts/new-photo.sh path/to/photo.jpg"
	exit 1
fi

creation_datetime=$(exiftool -d "%Y-%m-%dT%H:%M:%S" -DateTimeOriginal -s3 "$1")
creation_date=$(exiftool -d "%Y-%m-%d" -DateTimeOriginal -s3 "$1")

if [ -z "$creation_date" ]; then
  echo "Failed to extract the creation date from the exif data."
  exit 1
fi

read -p "Slug: " slug
read -p "Title: " title
read -p "Location: " location
read -p "Tags [comma separated]: " tags
read -p "Alt text: " alt_text

img_path="./static/img/photo/$creation_date-$slug.jpg"
md_path="./content/photo/$creation_date-$slug.md"
abs_img_path="/img/photo/$creation_date-$slug.jpg"

# Move and transform the image file
# brew install imagemagick if mogrify is missing
cp $1 $img_path
mogrify -quiet -format jpg -layers Dispose -resize 1400\>x1400\> -quality 100% $img_path

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

echo "$md_template"
echo $md_path
echo "$md_template" > $md_path
