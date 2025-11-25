#!/bin/bash
set -euo pipefail

# Script to update book data using the cover CLI
# Requires: cover CLI (https://github.com/jackreid/cover) and HARDCOVER_API_KEY
# Updates three book lists: toread, reading, and read

# Check if cover CLI is available
if ! command -v cover &> /dev/null; then
	echo "Error: cover CLI not found. Please install cover CLI from https://github.com/jackreid/cover"
	exit 1
fi

# Check if HARDCOVER_API_KEY is set
if [[ -z "${HARDCOVER_API_KEY:-}" ]]; then
	echo "Error: HARDCOVER_API_KEY environment variable not set"
	echo "Please set your Hardcover API key: export HARDCOVER_API_KEY='your-api-key-here'"
	exit 1
fi

# Create books directory if it doesn't exist
mkdir -p ./data/books

# Update books using cover CLI with --blog format (matches existing data structure)
# Handle case where cover CLI returns "No books found" message instead of empty JSON array
echo "Updating book lists..."
cover list toread --blog > ./data/books/toread.json.tmp || {
	echo "Error: Failed to fetch 'toread' list"
	exit 1
}

cover list reading --blog > ./data/books/reading.json.tmp || {
	echo "Error: Failed to fetch 'reading' list"
	exit 1
}

cover list read --blog > ./data/books/read.json.tmp || {
	echo "Error: Failed to fetch 'read' list"
	exit 1
}

# Convert "No books found" messages to empty JSON arrays
# This handles the case where the API returns a message instead of valid JSON
for file in toread reading read; do
	if grep -q "No books found" "./data/books/${file}.json.tmp"; then
		echo "[]" > "./data/books/${file}.json"
	else
		mv "./data/books/${file}.json.tmp" "./data/books/${file}.json"
	fi
done

# Clean up any remaining temporary files
rm -f ./data/books/*.json.tmp

echo "Successfully updated book data:"
echo "  - ./data/books/toread.json"
echo "  - ./data/books/reading.json"
echo "  - ./data/books/read.json"
