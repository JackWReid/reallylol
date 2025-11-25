#!/bin/bash
set -euo pipefail

# Script to automatically download and update Letterboxd film data
# This script attempts to download the data export from Letterboxd using cookies
# and then processes it automatically.

# Configuration
LETTERBOXD_DATA_URL="https://letterboxd.com/settings/data/"
DEFAULT_COOKIE_FILE="./creds/letterboxd-cookies.txt"
COOKIE_FILE="${LETTERBOXD_COOKIE_FILE:-}"
COOKIES="${LETTERBOXD_COOKIES:-}"
TMP_DIR="./tmp"
EXPORT_DIR="${TMP_DIR}/letterboxd-export"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    if [ -d "${TMP_DIR}" ]; then
        rm -rf "${TMP_DIR}"
    fi
}

trap cleanup EXIT

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${RED}Error: sqlite3 not found. Please install sqlite3.${NC}"
    exit 1
fi

# Check if unzip is available
if ! command -v unzip &> /dev/null; then
    echo -e "${RED}Error: unzip not found. Please install unzip.${NC}"
    exit 1
fi

# Function to download using cookies
download_with_cookies() {
    local cookie_arg=""
    
    if [ -n "${COOKIE_FILE}" ]; then
        if [ -f "${COOKIE_FILE}" ]; then
            cookie_arg="-b ${COOKIE_FILE}"
            echo "Using cookie file: ${COOKIE_FILE}"
        else
            echo -e "${RED}Error: Specified cookie file not found: ${COOKIE_FILE}${NC}"
            return 1
        fi
    elif [ -f "${DEFAULT_COOKIE_FILE}" ]; then
        cookie_arg="-b ${DEFAULT_COOKIE_FILE}"
        echo "Using default cookie file: ${DEFAULT_COOKIE_FILE}"
    elif [ -n "${COOKIES}" ]; then
        cookie_arg="-H 'Cookie: ${COOKIES}'"
        echo "Using cookies from environment variable"
    else
        echo -e "${RED}Error: No cookie file specified and default (${DEFAULT_COOKIE_FILE}) not found.${NC}"
        echo "Set LETTERBOXD_COOKIE_FILE or place cookies at ${DEFAULT_COOKIE_FILE}."
        return 1
    fi
    
    # Create tmp directory
    mkdir -p "${TMP_DIR}"
    
    # First, try to get the data export page to see if we're authenticated
    echo "Checking authentication..."
    local auth_check=$(eval curl -s -L ${cookie_arg} -w "%{http_code}" -o /dev/null "${LETTERBOXD_DATA_URL}")
    
    if [ "${auth_check}" != "200" ]; then
        echo -e "${YELLOW}Warning: Authentication check returned ${auth_check}. Cookies may be invalid.${NC}"
        echo -e "${YELLOW}Attempting download anyway...${NC}"
    fi
    
    # Try to download the data export
    # Letterboxd may require triggering a download, so we'll try a few approaches
    echo "Attempting to download data export..."
    
    # Approach 1: Try direct download URL (if Letterboxd provides one)
    # This might not work if Letterboxd requires a button click to generate
    local zip_file="${TMP_DIR}/letterboxd-data.zip"
    
    # Try to find and download the export
    # We'll check the page for download links
    local page_content=$(eval curl -s -L ${cookie_arg} "${LETTERBOXD_DATA_URL}")
    
    # Look for download links in the page
    local download_url=$(echo "${page_content}" | grep -oP 'href="[^"]*\.zip[^"]*"' | head -1 | sed 's/href="//;s/"$//')
    
    if [ -n "${download_url}" ]; then
        # Make URL absolute if relative
        if [[ ! "${download_url}" =~ ^https?:// ]]; then
            download_url="https://letterboxd.com${download_url}"
        fi
        echo "Found download URL: ${download_url}"
        eval curl -s -L ${cookie_arg} -o "${zip_file}" "${download_url}"
    else
        # Approach 2: Try to find and submit a form (if Letterboxd requires button click)
        echo "No direct download link found. Checking for export forms..."
        
        # Look for form actions that might trigger export
        local form_action=$(echo "${page_content}" | grep -oP '<form[^>]*action="[^"]*"[^>]*>' | grep -i "data\|export" | head -1 | grep -oP 'action="[^"]*"' | sed 's/action="//;s/"$//')
        
        if [ -n "${form_action}" ]; then
            # Make URL absolute if relative
            if [[ ! "${form_action}" =~ ^https?:// ]]; then
                form_action="https://letterboxd.com${form_action}"
            fi
            
            # Try to extract CSRF token if present
            local csrf_token=$(echo "${page_content}" | grep -oP 'name="csrf[^"]*"\s+value="[^"]*"' | grep -oP 'value="[^"]*"' | sed 's/value="//;s/"$//' | head -1)
            
            echo "Found form action: ${form_action}"
            
            # Submit the form
            local form_data=""
            if [ -n "${csrf_token}" ]; then
                form_data="csrf=${csrf_token}"
            fi
            
            if [ -n "${form_data}" ]; then
                eval curl -s -L ${cookie_arg} -X POST -d "${form_data}" -o "${zip_file}" "${form_action}"
            else
                eval curl -s -L ${cookie_arg} -X POST -o "${zip_file}" "${form_action}"
            fi
            
            # Check if we got a redirect or the file
            if [ -f "${zip_file}" ] && [ -s "${zip_file}" ]; then
                if file "${zip_file}" | grep -q "Zip archive"; then
                    echo -e "${GREEN}Successfully downloaded export via form submission${NC}"
                else
                    # Might be a redirect or HTML response
                    local content_type=$(file "${zip_file}")
                    if echo "${content_type}" | grep -q "HTML\|text"; then
                        echo "Form submission returned HTML, checking for download link..."
                        # Try to extract download URL from response
                        download_url=$(cat "${zip_file}" | grep -oP 'href="[^"]*\.zip[^"]*"' | head -1 | sed 's/href="//;s/"$//')
                        if [ -n "${download_url}" ]; then
                            if [[ ! "${download_url}" =~ ^https?:// ]]; then
                                download_url="https://letterboxd.com${download_url}"
                            fi
                            echo "Found download URL in response: ${download_url}"
                            eval curl -s -L ${cookie_arg} -o "${zip_file}" "${download_url}"
                        fi
                    fi
                fi
            fi
        fi
        
        # Approach 3: Try common export URL patterns
        if [ ! -f "${zip_file}" ] || [ ! -s "${zip_file}" ] || ! file "${zip_file}" | grep -q "Zip archive"; then
            echo "Trying direct export endpoints..."
            
            local export_endpoints=(
                "https://letterboxd.com/settings/data/export/"
                "https://letterboxd.com/settings/data/download/"
                "https://letterboxd.com/data/export/"
            )
            
            local downloaded=false
            for endpoint in "${export_endpoints[@]}"; do
                echo "Trying: ${endpoint}"
                local status=$(eval curl -s -L ${cookie_arg} -w "%{http_code}" -o "${zip_file}" "${endpoint}")
                if [ "${status}" = "200" ] && [ -f "${zip_file}" ] && [ -s "${zip_file}" ]; then
                    # Check if it's actually a ZIP file
                    if file "${zip_file}" | grep -q "Zip archive"; then
                        echo -e "${GREEN}Successfully downloaded export from ${endpoint}${NC}"
                        downloaded=true
                        break
                    fi
                fi
            done
            
            if [ "${downloaded}" = "false" ]; then
                echo -e "${RED}Error: Could not automatically download the export.${NC}"
                echo -e "${YELLOW}Letterboxd may require manual interaction to generate the export.${NC}"
                echo ""
                echo "Please try one of these options:"
                echo "1. Manually download from https://letterboxd.com/settings/data/"
                echo "   Then run: ./scripts/update-films-auto.sh /path/to/extracted/export/"
                echo ""
                echo "2. Export your browser cookies and try again:"
                echo "   - Install browser extension 'cookies.txt' or 'Get cookies.txt LOCALLY'"
                echo "   - Export cookies for letterboxd.com"
                echo "   - Set LETTERBOXD_COOKIE_FILE=/path/to/cookies.txt"
                echo "   - Or set LETTERBOXD_COOKIES='cookie1=value1; cookie2=value2'"
                return 1
            fi
        fi
    fi
    
    # Verify we got a valid ZIP file
    if [ ! -f "${zip_file}" ] || [ ! -s "${zip_file}" ]; then
        echo -e "${RED}Error: Download failed or file is empty.${NC}"
        return 1
    fi
    
    if ! file "${zip_file}" | grep -q "Zip archive"; then
        echo -e "${RED}Error: Downloaded file is not a valid ZIP archive.${NC}"
        echo "The file might be an HTML error page. Check your cookies."
        return 1
    fi
    
    echo -e "${GREEN}Successfully downloaded Letterboxd export${NC}"
    
    # Extract the ZIP file
    echo "Extracting export..."
    mkdir -p "${EXPORT_DIR}"
    unzip -q "${zip_file}" -d "${EXPORT_DIR}" || {
        echo -e "${RED}Error: Failed to extract ZIP file.${NC}"
        return 1
    }
    
    # Process the export
    process_export "${EXPORT_DIR}"
}

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
    sqlite3 < ./scripts/update-film.sql || {
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
    
    # Check if a directory path was provided (manual mode)
    if [ $# -gt 0 ]; then
        echo "Manual mode: Processing provided export directory"
        process_export "$1"
        return $?
    fi
    
    # Try automatic download
    if [ -n "${COOKIE_FILE}" ] || [ -n "${COOKIES}" ]; then
        echo "Automatic mode: Attempting to download export using cookies"
        download_with_cookies
        return $?
    else
        echo -e "${YELLOW}No cookies provided. Cannot download automatically.${NC}"
        echo ""
        echo "Usage options:"
        echo ""
        echo "1. Automatic download (requires cookies):"
        echo "   export LETTERBOXD_COOKIE_FILE=/path/to/cookies.txt"
        echo "   # OR"
        echo "   export LETTERBOXD_COOKIES='cookie1=value1; cookie2=value2'"
        echo "   ./scripts/update-films-auto.sh"
        echo "   (defaults to ${DEFAULT_COOKIE_FILE} if present)"
        echo ""
        echo "2. Manual processing (if you already have the export):"
        echo "   ./scripts/update-films-auto.sh /path/to/extracted/export/"
        echo ""
        echo "To get cookies:"
        echo "  - Install browser extension 'cookies.txt' or 'Get cookies.txt LOCALLY'"
        echo "  - Export cookies for letterboxd.com"
        echo "  - Save to a file or copy the cookie string"
        exit 1
    fi
}

main "$@"
