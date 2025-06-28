#!/bin/bash

# Set your Gemini API key here
export GEMINI_API_KEY="AIzaSyBu4xexZBsM2oYMZAb7QbGdgrh--Ja0RSM"

# Wrapper script to run tag-content.py in the separate uv environment
# This avoids Python 3.14 compatibility issues with pydantic-core

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_DIR="$SCRIPT_DIR/tag-content-env"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ ! -d "$ENV_DIR" ]; then
    echo "Error: tag-content-env directory not found. Please run the setup first."
    exit 1
fi

cd "$ENV_DIR"

# If the first argument is "file" and there's a second argument, make it an absolute path
if [ "$1" = "file" ] && [ -n "$2" ]; then
    # If the path is already absolute, use it as is
    if [[ "$2" == /* ]]; then
        uv run python tag-content.py "$@"
    else
        # Make it relative to the project root
        uv run python tag-content.py "$1" "$PROJECT_ROOT/$2"
    fi
else
    uv run python tag-content.py "$@"
fi 