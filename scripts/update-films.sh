#!/bin/bash
set -euo pipefail

# Script to update Letterboxd film data
#
# This script processes Letterboxd export data and generates JSON files for watched
# and to-watch films.
#
# Usage: ./scripts/update-films.sh /path/to/extracted/export/
#
# Requirements:
#   - Export directory containing watchlist.csv and diary.csv
#   - sqlite3 (for processing CSV data)
#
# To get your export:
#   1. Visit https://letterboxd.com/settings/data/ in your browser
#   2. Click "Export your data"
#   3. Wait for the email with download link (or check the page for download)
#   4. Download and extract the ZIP file
#   5. Run this script with the path to the extracted directory
#
# Output:
#   - ./data/films/watched.json
#   - ./data/films/towatch.json

# Configuration
TMP_DIR="./tmp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}Error: sqlite3 not found. Please install sqlite3.${NC}"
    exit 1
fi

# Function to process an existing export directory
process_export() {
    local export_path="$1"

    if [ ! -d "${export_path}" ]; then
        echo -e "${RED}Error: Export directory does not exist: ${export_path}${NC}"
        return 1
    fi

    # Check for required CSV files
    if [ ! -f "${export_path}/watchlist.csv" ]; then
        echo -e "${RED}Error: watchlist.csv not found in ${export_path}${NC}"
        return 1
    fi

    if [ ! -f "${export_path}/diary.csv" ]; then
        echo -e "${RED}Error: diary.csv not found in ${export_path}${NC}"
        return 1
    fi

    echo "Processing export files..."

    # Create tmp directory for processing
    mkdir -p "${TMP_DIR}"

    # Copy CSV files to tmp
    cp "${export_path}/watchlist.csv" "${TMP_DIR}/watchlist.csv"
    cp "${export_path}/diary.csv" "${TMP_DIR}/diary.csv"

    # Run SQLite processing
    echo "Running SQLite processing..."
    sqlite3 < ./scripts/letterboxd-parse.sql || {
        echo -e "${RED}Error: SQLite processing failed.${NC}"
        return 1
    }

    # Move output files
    mkdir -p ./data/films
    mv "${TMP_DIR}/watched.json" ./data/films/watched.json
    mv "${TMP_DIR}/towatch.json" ./data/films/towatch.json

    echo -e "${GREEN}Successfully updated film data!${NC}"
    echo "  - ./data/films/watched.json"
    echo "  - ./data/films/towatch.json"
}

# Main execution
main() {
    echo "Updating films from Letterboxd export"
    echo "======================================"
    echo ""

    # Check if a directory path was provided
    if [ $# -eq 0 ]; then
        echo -e "${RED}Error: No export directory provided${NC}"
        echo ""
        echo "Usage: ./scripts/update-films.sh /path/to/extracted/export/"
        echo ""
        echo "To get your export:"
        echo "  1. Visit https://letterboxd.com/settings/data/ in your browser"
        echo "  2. Click 'Export your data' and wait for the download"
        echo "  3. Download the ZIP file and extract it"
        echo "  4. Run this script with the path to the extracted directory"
        echo ""
        echo "Example:"
        echo "  ./scripts/update-films.sh ~/Downloads/letterboxd-jackreid-2026-01-31-12-34/"
        exit 1
    fi

    echo "Processing export directory: $1"
    process_export "$1"
}

main "$@"
