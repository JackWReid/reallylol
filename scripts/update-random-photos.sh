#!/bin/bash
set -euo pipefail

# Script to precompute eligible photos for random selection in footer
# Scans content/photo/, filters by exclude_tags from data/content_config.json,
# and writes eligible photo paths to data/random_photos.json
# This reduces build-time computation by pre-filtering photos before Hugo builds

# Check for required tools
if ! command -v jq &> /dev/null; then
	echo "Error: jq is required but not installed. Install with: brew install jq"
	exit 1
fi

# Check if content_config.json exists
if [ ! -f "./data/content_config.json" ]; then
	echo "Error: data/content_config.json not found"
	exit 1
fi

# Load exclude_tags from content_config.json
exclude_tags=$(jq -r '.exclude_tags[]' ./data/content_config.json)

# Create data directory if it doesn't exist
mkdir -p ./data

# Count total photos first
total_photos=0
for photo_file in ./content/photo/*.md; do
	[ -f "$photo_file" ] && ((total_photos++)) || true
done

if [ $total_photos -eq 0 ]; then
	echo "No photo files found in content/photo/"
	exit 1
fi

# Start timing
start_time=$(date +%s)

# Temporary file for building JSON array
temp_file=$(mktemp)
echo "[" > "$temp_file"

# Counter for JSON formatting
first=true
current_photo=0

# Process each photo file
for photo_file in ./content/photo/*.md; do
	# Skip if no files match the pattern
	[ -f "$photo_file" ] || continue
	
	# Update progress counter
	((current_photo++))
	
	# Display progress (overwrite same line, update every 10 photos or on last photo)
	if [ $((current_photo % 10)) -eq 0 ] || [ $current_photo -eq $total_photos ]; then
		printf "\rScanning photos: %d/%d" "$current_photo" "$total_photos" >&2
	fi
	
	# Extract filename without extension for slug
	filename=$(basename "$photo_file" .md)
	
	# Extract tags from front matter
	# Handle both YAML list format and inline array format
	all_tags=""
	
	# Check for inline array format: tags: [ tag1, tag2 ] or tags: [tag1, tag2]
	if grep -qE '^tags:\s*\[' "$photo_file"; then
		# Extract inline array
		inline_line=$(grep -E '^tags:\s*\[' "$photo_file" | head -1)
		all_tags=$(echo "$inline_line" | sed 's/^tags:\s*\[//' | sed 's/\]\s*$//' | tr ',' '\n' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | sed "s/^'//" | sed "s/'$//" | sed 's/^"//' | sed 's/"$//' | grep -v '^$' || true)
	else
		# Handle YAML list format (tags: followed by lines starting with -)
		# Extract everything between "tags:" and next top-level key or end of front matter
		tags_section=$(awk '/^tags:/{flag=1; next} /^[a-zA-Z]/ && flag {flag=0} flag' "$photo_file" | sed 's/^[[:space:]]*-[[:space:]]*//' | sed 's/^[[:space:]]*//' | sed "s/^'//" | sed "s/'$//" | sed 's/^"//' | sed 's/"$//' | grep -v '^$' || true)
		all_tags="$tags_section"
	fi
	
	# Check if any tags intersect with exclude_tags
	should_exclude=false
	if [ -n "$all_tags" ]; then
		while IFS= read -r tag || [ -n "$tag" ]; do
			# Normalize tag (lowercase, trim whitespace)
			normalized_tag=$(echo "$tag" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
			# Skip empty tags
			[ -z "$normalized_tag" ] && continue
			for exclude_tag in $exclude_tags; do
				if [ "$normalized_tag" = "$exclude_tag" ]; then
					should_exclude=true
					break 2
				fi
			done
		done <<< "$all_tags"
	fi
	
	# Add to list if not excluded
	if [ "$should_exclude" = false ]; then
		if [ "$first" = true ]; then
			first=false
		else
			echo "," >> "$temp_file"
		fi
		# Escape filename for JSON
		escaped_filename=$(echo "$filename" | jq -Rs .)
		echo -n "  {\"path\": \"photo/$filename\"}" >> "$temp_file"
	fi
done

echo "" >> "$temp_file"
echo "]" >> "$temp_file"

# Clear progress line and move to new line
printf "\r" >&2
echo "" >&2

# Validate JSON before writing
if ! jq empty "$temp_file" 2>/dev/null; then
	echo "Error: Generated invalid JSON"
	rm -f "$temp_file"
	exit 1
fi

# Write to final location
mv "$temp_file" ./data/random_photos.json

# Calculate elapsed time
end_time=$(date +%s)
elapsed=$((end_time - start_time))

# Count photos
photo_count=$(jq 'length' ./data/random_photos.json)

echo "Successfully updated random photo pool:"
echo "  - ./data/random_photos.json"
echo "  - $photo_count eligible photos"
echo "  - Scanned in ${elapsed}s"

