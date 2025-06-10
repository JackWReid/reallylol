#! /bin/bash
set -o pipefail
export LC_ALL=C

# SCRIPT PLAN
# Read the tags.json file
# Use `jq` to read the tags.json file and set the system prompt for the LLM to prefer existing tags
# Use the `charmbracelet/gum` bash helpers to prompt the user
# Go one-by-one through the posts, previewing the post and suggesting tags
# Allow the user to edit or add their own tags
# In the case of image posts, provide a localhost URL to the image page
# In the case of image posts, find the image in the `public/images` directory and provide the path to the image to the LLM vision tool
# Use `simonw/llm` tool to call gemini on text posts
# Use `simonw/llm` tool to call gemini vision on image posts
# Write the tags to the frontmatter of the post, appending or creating the tags key


# `llm` usage`
# Use the template function to define the system prompt. Templates are created like so:
# llm -s 'write pytest tests for this code' --save pytest # save a template
# cat llm/utils.py | llm -t pytest # use a template
# llm -m gemini-1.5-flash-8b-latest "suggest tags for this image" -a ~/Developer/reallylol/static/img/photo/2012-06-21-e963f2ebd671787d7d997f8971cb7114.jpg

# `gum` usage
# choose: Choose an option from a list of choices
# confirm: Ask a user to confirm an action
# file: Pick a file from a folder
# filter: Filter items from a list
# format: Format a string using a template
# input: Prompt for some input
# join: Join text vertically or horizontally
# pager: Scroll through a file
# spin: Display spinner while running a command
# style: Apply coloring, borders, spacing to text
# table: Render a table of data
# write: Prompt for long-form text
# log: Log messages to output

# BUGS
# - The pager only previews the frontmatter of the post, never anything more
# - The script replaces the entire contents of the frontmatter with a line for tags, removing the title, date, and any other fields
# - The tags returned from the llm seemed to only be based on the tags in the frontmatter rather than text post content

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
        # Extract content after frontmatter
        awk '/^---$/{p=!p;next}p' "$post_file" | tail -n +2
    fi
}

# Function to get post frontmatter
get_post_frontmatter() {
    local post_file="$1"
    if [[ -f "$post_file" ]]; then
        # Extract frontmatter
        awk '/^---$/{p=!p;next}p' "$post_file" | head -n 1
    fi
}

# Function to get all frontmatter fields
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
    declare -A existing_set
    for tag in "${existing_array[@]}"; do
        existing_set["$tag"]=1
    done
    
    # Separate existing and new tags
    local existing_found=()
    local new_tags=()
    
    for tag in "${suggested_array[@]}"; do
        tag=$(echo "$tag" | xargs) # Trim whitespace
        if [[ -n "$tag" ]]; then
            if [[ -n "${existing_set[$tag]}" ]]; then
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
    local suggested_tags=$(echo "$content" | llm -m gemini-1.5-flash-8b-latest -s "$system_prompt" --no-stream)
    
    # Process and format the tags
    local processed_tags=$(process_tags "$suggested_tags" "$existing_tags")
    
    # Show preview and get user input
    gum style --border normal --margin "1" --padding "1" --border-foreground 212 "Content preview:"
    echo "$(get_short_preview "$content")" | gum pager --height 10 --width 100
    gum style --border normal --margin "1" --padding "1" --border-foreground 212 "Suggested tags: $processed_tags"
    
    local user_tags=$(gum input --value "$processed_tags" --placeholder "Enter tags (comma-separated)")
    
    if [ -n "$user_tags" ]; then
        update_post_tags "$post_file" "$user_tags"
    fi
}

# Function to process an image post
process_image_post() {
    local post_file="$1"
    local image_path="$2"
    local frontmatter="$3"
    
    # Get existing tags
    local existing_tags=$(get_existing_tags "$frontmatter")
    
    # Get image content
    local image_url="http://localhost:3000$(echo "$image_path" | sed 's|^public||')"
    
    # Use llm with vision model to analyze image
    local suggested_tags=$(llm -m gemini-1.5-flash-8b-latest "suggest tags for this image" -a "$image_path" -s "$system_prompt" --no-stream)
    
    # Process and format the tags
    local processed_tags=$(process_tags "$suggested_tags" "$existing_tags")
    
    # Show preview and get user input
    gum style --border normal --margin "1" --padding "1" --border-foreground 212 "Image URL: $image_url"
    gum style --border normal --margin "1" --padding "1" --border-foreground 212 "Suggested tags: $processed_tags"
    
    local user_tags=$(gum input --value "$processed_tags" --placeholder "Enter tags (comma-separated)")
    
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
        
        gum style --border normal --margin "1" --padding "1" --border-foreground 212 "Processing: $post"
        
        # Get post content and frontmatter
        local content=$(get_post_content "$post")
        local frontmatter=$(get_post_frontmatter "$post")
        
        # Check if it's an image post
        if [[ "$frontmatter" == *"image:"* ]]; then
            local image_path=$(echo "$frontmatter" | grep -o 'image:.*' | cut -d' ' -f2)
            process_image_post "$post" "$PROJECT_ROOT/$image_path" "$frontmatter"
        else
            process_text_post "$post" "$content" "$frontmatter"
        fi
        
        # Ask if user wants to continue
        if ! gum confirm "Continue to next post?"; then
            break
        fi
    done
}

# Run the main function
main

