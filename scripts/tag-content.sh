#! /bin/bash
set -o pipefail
export LC_ALL=C

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Get the project root directory (one level up from scripts)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Get the tags.json file
tags_file="$PROJECT_ROOT/data/tags.json"

# Check if required tools are installed
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required but not installed. Please install it first."; exit 1; }
command -v gum >/dev/null 2>&1 || { echo "Error: gum is required but not installed. Please install it first."; exit 1; }
command -v llm >/dev/null 2>&1 || { echo "Error: llm is required but not installed. Please install it first."; exit 1; }

# Create a system prompt for the LLM using existing tags
system_prompt="You are a helpful assistant that suggests tags for content. Here are the existing tags and their usage counts:\n"
system_prompt+=$(jq -r 'to_entries | .[] | "- \(.key): \(.value)"' "$tags_file" | sort -rn -k2 | head -n 20)
system_prompt+="\nPlease suggest relevant tags from this list, or suggest new tags if none are appropriate. Format your response as a comma-separated list of tags, nothing else. Limit suggestions to 10 tags maximum."

# Function to get post content
get_post_content() {
    local post_file="$1"
    if [[ -f "$post_file" ]]; then
        # Extract content after frontmatter (skip the frontmatter section)
        awk '/^---$/{p=!p;next}!p' "$post_file"
    fi
}

# Function to get all frontmatter
get_all_frontmatter() {
    local post_file="$1"
    if [[ -f "$post_file" ]]; then
        # Extract all frontmatter between --- markers
        awk '/^---$/{p=!p;next}p' "$post_file" | head -n 1
    fi
}

# Function to check if post is a note
is_note() {
    local post_file="$1"
    if [[ -f "$post_file" ]]; then
        # Check if the path contains "note"
        if [[ "$post_file" == *"/note/"* ]]; then
            return 0
        fi
    fi
    return 1
}

# Function to get a short preview of content
get_short_preview() {
    local content="$1"
    # Get first 5 lines or 300 characters, whichever is shorter
    echo "$content" | head -n 5 | cut -c 1-300
}

# Function to update post tags
update_post_tags() {
    local post_file="$1"
    local new_tags="$2"
    
    # Create temporary file
    local temp_file=$(mktemp)
    
    # Get existing frontmatter
    local frontmatter=$(get_all_frontmatter "$post_file")
    
    # Write frontmatter with updated tags
    echo "---" > "$temp_file"
    if [[ "$frontmatter" == *"tags:"* ]]; then
        # Replace existing tags line
        echo "$frontmatter" | sed "s/tags:.*/tags: $new_tags/" >> "$temp_file"
    else
        # Add tags to existing frontmatter
        echo "$frontmatter" >> "$temp_file"
        echo "tags: $new_tags" >> "$temp_file"
    fi
    echo "---" >> "$temp_file"
    
    # Append the rest of the content
    awk '/^---$/{p=!p;next}!p' "$post_file" >> "$temp_file"
    
    # Replace original file
    mv "$temp_file" "$post_file"
}

# Function to process and format tags
process_tags() {
    local suggested_tags="$1"
    local existing_tags="$2"
    
    # Convert to arrays
    IFS=',' read -ra suggested_array <<< "$suggested_tags"
    IFS=',' read -ra existing_array <<< "$existing_tags"
    
    # Create a set of existing tags for quick lookup
    existing_set=""
    for tag in "${existing_array[@]}"; do
        if [[ -n "$existing_set" ]]; then
            existing_set="$existing_set|$tag"
        else
            existing_set="$tag"
        fi
    done
    
    # Separate existing and new tags
    local existing_found=()
    local new_tags=()
    
    for tag in "${suggested_array[@]}"; do
        tag=$(echo "$tag" | xargs) # Trim whitespace
        if [[ -n "$tag" ]]; then
            if [[ "$existing_set" == *"$tag"* ]]; then
                existing_found+=("$tag")
            else
                new_tags+=("$tag")
            fi
        fi
    done
    
    # Combine tags, existing first, then new, limiting to 10 total
    local result=("${existing_found[@]}")
    local remaining=$((10 - ${#result[@]}))
    if [[ $remaining -gt 0 ]]; then
        result+=("${new_tags[@]:0:$remaining}")
    fi
    
    # Join with commas
    IFS=,; echo "${result[*]}"
}

# Function to get existing tags from frontmatter
get_existing_tags() {
    local frontmatter="$1"
    if [[ "$frontmatter" == *"tags:"* ]]; then
        echo "$frontmatter" | grep -o 'tags:.*' | cut -d' ' -f2-
    else
        echo ""
    fi
}

# Function to process a text post
process_text_post() {
    local post_file="$1"
    local content="$2"
    local frontmatter="$3"
    
    # Get existing tags
    local existing_tags=$(get_existing_tags "$frontmatter")
    
    # Use llm to suggest tags based on the actual content
    echo "Debug: Sending to model:"
    echo "$content" | head -n 5
    local suggested_tags=$(echo "$content" | llm -m gemini-1.5-flash-8b-latest -s "$system_prompt" --no-stream)
    
    # Process and format the tags
    local processed_tags=$(process_tags "$suggested_tags" "$existing_tags")
    
    # Show preview and get user input
    echo "👁️ Content preview:"
    echo "Debug: Content length: ${#content}"
    echo "Debug: Content first few characters: ${content:0:50}"
    echo "$content" | head -n 20
    echo "🔍 Suggested tags: $processed_tags"
    
    local user_tags=$(gum write --value "$processed_tags" --placeholder "Enter tags (comma-separated)")
    
    if [ -n "$user_tags" ]; then
        update_post_tags "$post_file" "$user_tags"
    fi
}

# Main script logic
main() {
    # Get all markdown files in the content directory
    local posts=($(find "$PROJECT_ROOT/content" -type f -name "*.md"))
    
    for post in "${posts[@]}"; do
        # Skip notes
        if is_note "$post"; then
            continue
        fi
        
        # Skip image posts
        if grep -q "^image:" "$post"; then
            continue
        fi
        

        # Get post content and frontmatter
        local content=$(get_post_content "$post")
        local frontmatter=$(get_all_frontmatter "$post")

        echo "🔄 Processing: $post"
        echo $content
        
        process_text_post "$post" "$content" "$frontmatter"
        
        # Ask if user wants to continue
        if ! gum confirm "Continue to next post?"; then
            break
        fi
    done
}

# Run the main function
main 