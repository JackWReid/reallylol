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
cover list toread --blog > ./data/books/toread.json
cover list reading --blog > ./data/books/reading.json
cover list read --blog > ./data/books/read.json
