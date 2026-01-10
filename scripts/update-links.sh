#!/bin/bash
set -euo pipefail

# Script to update links data from Raindrop.io API
# Requires: Token file at ./creds/raindrop-token OR RAINDROP_ACCESS_TOKEN env var, curl, jq
# Fetches links with a specific tag and saves to data/links.json
#
# Getting a Test Token:
# 1. Go to https://app.raindrop.io/settings/integrations
# 2. Click "+ Create new app" (or use an existing app)
# 3. Click "Create test token" in the app settings
# 4. Copy the generated token and save it to: ./creds/raindrop-token
#    (or set as: export RAINDROP_ACCESS_TOKEN='your-test-token-here')
#
# Note: Test tokens are perfect for personal use and don't require OAuth setup.

# Check if curl is available
if ! command -v curl &> /dev/null; then
	echo "Error: curl not found. Please install curl."
	exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
	echo "Error: jq is required but not installed. Install with: brew install jq"
	exit 1
fi

# Configuration
DEFAULT_TOKEN_FILE="./creds/raindrop-token"

# Determine token source: file first, then environment variable
# Store env var value before we potentially create a local variable with same name
ENV_TOKEN="${RAINDROP_ACCESS_TOKEN:-}"
RAINDROP_ACCESS_TOKEN=""

# Priority 1: Try file first
if [ -f "${DEFAULT_TOKEN_FILE}" ]; then
	# Read token from file, trim whitespace/newlines
	RAINDROP_ACCESS_TOKEN=$(cat "${DEFAULT_TOKEN_FILE}" | tr -d '\n\r' | xargs)
	if [[ -n "${RAINDROP_ACCESS_TOKEN}" ]]; then
		echo "Using token from: ${DEFAULT_TOKEN_FILE}"
	fi
fi

# Priority 2: Fall back to environment variable if file didn't provide a token
if [[ -z "${RAINDROP_ACCESS_TOKEN}" ]] && [[ -n "${ENV_TOKEN}" ]]; then
	RAINDROP_ACCESS_TOKEN="${ENV_TOKEN}"
	echo "Using token from RAINDROP_ACCESS_TOKEN environment variable"
fi

# Check if we have a token
if [[ -z "${RAINDROP_ACCESS_TOKEN}" ]]; then
	echo "Error: Raindrop access token not found"
	echo ""
	echo "Token source (checked in order):"
	echo "  1. File: ${DEFAULT_TOKEN_FILE}"
	echo "  2. Environment variable: RAINDROP_ACCESS_TOKEN"
	echo ""
	echo "To get a test token:"
	echo "  1. Go to https://app.raindrop.io/settings/integrations"
	echo "  2. Click '+ Create new app' (or select an existing app)"
	echo "  3. Click 'Create test token'"
	echo "  4. Copy the token and save it to: ${DEFAULT_TOKEN_FILE}"
	echo "     (or set as: export RAINDROP_ACCESS_TOKEN='your-test-token-here')"
	exit 1
fi

# Get tag name from argument, environment variable, or default to "toblog"
TAG="${1:-${RAINDROP_TAG:-toblog}}"

# Create data directory if it doesn't exist
mkdir -p ./data

# API configuration
API_BASE="https://api.raindrop.io/rest/v1"
COLLECTION_ID="0"
PER_PAGE=50
TEMP_FILE=$(mktemp)
OUTPUT_FILE="./data/links.json.tmp"
ACCUMULATOR=$(mktemp)

# Cleanup function
cleanup() {
	rm -f "$TEMP_FILE" "$OUTPUT_FILE" "$ACCUMULATOR" 2>/dev/null || true
}

trap cleanup EXIT

# Pagination loop
page=0
total_items=0

echo "Fetching links with tag: ${TAG}..."

while true; do
	# Build API URL with tag search and pagination
	# URL encode the tag and add # prefix
	encoded_tag=$(printf '%s' "$TAG" | jq -sRr @uri)
	api_url="${API_BASE}/raindrops/${COLLECTION_ID}?search=%23${encoded_tag}&page=${page}&perpage=${PER_PAGE}"
	
	# Make API request
	http_code=$(curl -s -w "%{http_code}" -o "$TEMP_FILE" \
		-H "Authorization: Bearer ${RAINDROP_ACCESS_TOKEN}" \
		-H "Content-Type: application/json" \
		"${api_url}" || echo "000")
	
	# Check HTTP response code
	if [ "$http_code" -eq 401 ]; then
		echo "Error: Authentication failed (401). Please check your RAINDROP_ACCESS_TOKEN."
		exit 1
	elif [ "$http_code" -eq 429 ]; then
		echo "Error: Rate limit exceeded (429). Please try again later."
		exit 1
	elif [ "$http_code" -ge 400 ]; then
		echo "Error: API request failed with HTTP status ${http_code}"
		if [ -f "$TEMP_FILE" ]; then
			echo "Response:"
			cat "$TEMP_FILE"
		fi
		exit 1
	elif [ "$http_code" != "200" ]; then
		echo "Error: Unexpected HTTP status ${http_code}"
		exit 1
	fi
	
	# Validate JSON response
	if ! jq empty "$TEMP_FILE" 2>/dev/null; then
		echo "Error: Invalid JSON response from API"
		exit 1
	fi
	
	# Extract items array and check if empty
	items_count=$(jq -r '.items | length' "$TEMP_FILE" 2>/dev/null || echo "0")
	
	if [ "$items_count" -eq 0 ]; then
		# No more items, break pagination loop
		break
	fi
	
	# Transform and append items to accumulator
	jq -c '.items[] | {
		title: (if .title and .title != "" then .title else .domain // "Untitled" end),
		url: .link,
		date: (.created | split("T")[0]),
		excerpt: (if .excerpt then .excerpt else "" end),
		tags: (if .tags then .tags else [] end),
		cover: (if .cover then .cover else "" end)
	}' "$TEMP_FILE" >> "$ACCUMULATOR"
	
	# Update total count
	total_items=$((total_items + items_count))
	
	# Check if there are more pages (if we got less than per_page, we're done)
	if [ "$items_count" -lt "$PER_PAGE" ]; then
		break
	fi
	
	# Move to next page
	page=$((page + 1))
done

# Build final JSON array from accumulated items
if [ "$total_items" -eq 0 ]; then
	# No items found, create empty array
	echo "[]" > "$OUTPUT_FILE"
else
	# Combine all items into a single JSON array, sort by date, reverse (most recent first)
	jq -s 'sort_by(.date) | reverse' "$ACCUMULATOR" > "$OUTPUT_FILE"
fi

# Clean up accumulator
rm -f "$ACCUMULATOR"

# Validate final JSON
if ! jq empty "$OUTPUT_FILE" 2>/dev/null; then
	echo "Error: Generated invalid JSON"
	exit 1
fi

# Get final count
link_count=$(jq 'length' "$OUTPUT_FILE")

# Atomically move to final location
mv "$OUTPUT_FILE" ./data/links.json

# Clean up temp file reference
OUTPUT_FILE=""

echo "Successfully updated links data:"
echo "  - ./data/links.json"
echo "  - ${link_count} links found"
