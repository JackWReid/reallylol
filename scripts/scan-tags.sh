#! /bin/bash
set -o pipefail
export LC_ALL=C

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the project root directory (one level up from scripts)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# EXAMPLE FRONTMATTER
# ---
# title: "@fat - Internet Historian"
# subtitle: "We should be doing more to write our history"
# date: 2016-05-05T15:03:42+01:00
# tags:
#   - tech
#   - internet
# ---

# Check if the data/tags.json file exists
if [ ! -f "$PROJECT_ROOT/data/tags.json" ]; then
  echo "data/tags.json file does not exist"
  exit 1
fi

# Clear the tags.json file
echo "{}" > "$PROJECT_ROOT/data/tags.json"

# Scan all post, highlight, note, and photo .md files and extract all tags
paths=("post" "highlight" "note" "photo")

# Create a temporary file for collecting tags
temp_file=$(mktemp)

for path in "${paths[@]}"; do
  while IFS= read -r file; do
    # Extract the tags from the frontmatter using sed
    if tags=$(sed -n '/^tags:/,/^[^[:space:]]/p' "$file" | grep '^[[:space:]]*-' | sed 's/^[[:space:]]*-[[:space:]]*//'); then
      echo "$tags" >> "$temp_file"
    fi
  done < <(find "$PROJECT_ROOT/content/$path" -name "*.md" -type f)
done

# Process the collected tags and update the JSON file
# 1. Read all tags
# 2. Filter out empty lines and tags containing "--"
# 3. Count frequencies
# 4. Sort by frequency (descending)
# 5. Convert to JSON object
jq -R -s '
  split("\n")[:-1] |                    # Split into lines, remove last empty line
  map(select(length > 0)) |             # Remove empty lines
  map(select(contains("--") | not)) |   # Remove any tag containing "--"
  group_by(.) |                         # Group identical tags
  map({key: .[0], value: length}) |     # Convert to {tag: count} pairs
  sort_by(.value) |                     # Sort by count
  reverse |                             # Reverse to get descending order
  from_entries                          # Convert to object
' "$temp_file" > "$PROJECT_ROOT/data/tags.json"

# Clean up
rm "$temp_file"
