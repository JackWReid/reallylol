#!/bin/bash
set -euo pipefail

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
cover list toread --blog > ./data/books/toread.json.tmp
cover list reading --blog > ./data/books/reading.json.tmp
cover list read --blog > ./data/books/read.json.tmp

# Convert "No books found" messages to empty JSON arrays
for file in toread reading read; do
    if grep -q "No books found" "./data/books/${file}.json.tmp"; then
        echo "[]" > "./data/books/${file}.json"
    else
        mv "./data/books/${file}.json.tmp" "./data/books/${file}.json"
    fi
done

# Clean up temporary files
rm -f ./data/books/*.json.tmp
