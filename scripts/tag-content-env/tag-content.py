#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
import json
import time
from datetime import datetime

import google.generativeai as genai
import frontmatter
import typer
from rich.console import Console
from rich.prompt import Confirm
from rich.panel import Panel
from rich.text import Text
from rich.live import Live
from rich.spinner import Spinner

# Initialize Typer app and Rich console
app = typer.Typer()
console = Console()

# Configuration & Constants
ROOT_DIR = Path(__file__).resolve()
while not (ROOT_DIR / "config.toml").exists() and ROOT_DIR != ROOT_DIR.parent:
    ROOT_DIR = ROOT_DIR.parent
CONTENT_DIR = ROOT_DIR / "content"
PROMPT_FILE = ROOT_DIR / "scripts" / "prompts" / "tag-content.md"

def get_all_existing_tags() -> List[str]:
    """Scan all posts in content/ and return a sorted, unique list of all tags currently in use."""
    all_tags = set()
    
    # Walk through content directories
    for content_type in ["post", "photo", "highlight", "note"]:
        content_path = CONTENT_DIR / content_type
        if not content_path.exists():
            continue
            
        for md_file in content_path.rglob("*.md"):
            try:
                post = frontmatter.load(md_file)
                if "tags" in post.metadata:
                    tags = post.metadata["tags"]
                    if isinstance(tags, list):
                        all_tags.update(tags)
                    elif isinstance(tags, str):
                        # Handle comma-separated string tags
                        all_tags.update(tag.strip() for tag in tags.split(","))
            except Exception as e:
                console.print(f"[yellow]Warning: Could not parse {md_file}: {e}[/yellow]")
    
    return sorted(list(all_tags))

def call_gemini_api(post_body: str, image_path: Optional[str] = None) -> Dict[str, Any]:
    """Call the Gemini API to suggest tags for the given content."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        console.print("[red]Error: GEMINI_API_KEY environment variable not set[/red]")
        sys.exit(1)
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
    
    # Load the prompt template
    if not PROMPT_FILE.exists():
        console.print(f"[red]Error: Prompt file not found at {PROMPT_FILE}[/red]")
        sys.exit(1)
    
    with open(PROMPT_FILE, 'r') as f:
        prompt_template = f.read()
    
    # Get existing tags and inject into prompt
    existing_tags = get_all_existing_tags()
    existing_tags_str = ", ".join(existing_tags)
    
    # Replace placeholders in the prompt
    prompt = prompt_template.replace("{{EXISTING_TAGS}}", existing_tags_str)
    prompt = prompt.replace("{content_goes_here}", post_body)
    
    # Show loading spinner
    with Live(Spinner("dots", text="Analyzing content with AI..."), console=console):
        try:
            if image_path and Path(image_path).exists():
                # Handle image content
                with open(image_path, 'rb') as img_file:
                    image_data = img_file.read()
                
                response = model.generate_content([prompt, image_data])
            else:
                # Text-only content
                response = model.generate_content(prompt)
            
            # Parse the response
            response_text = response.text.strip()
            
            # Try to extract JSON from the response
            # Look for JSON-like content in the response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                try:
                    result = json.loads(json_str)
                    # Ensure all expected keys exist
                    return {
                        "description": result.get("description", []),
                        "existing": result.get("existing", []),
                        "new": result.get("new", []),
                        "novel": result.get("novel", [])
                    }
                except json.JSONDecodeError:
                    console.print(f"[yellow]Warning: Could not parse JSON object: {response_text}[/yellow]")
            
            # Try to parse as JSON array (fallback for when Gemini returns just an array)
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                try:
                    tags_array = json.loads(json_str)
                    if isinstance(tags_array, list):
                        # Treat all tags as "new" when we get an array
                        return {
                            "description": [],
                            "existing": [],
                            "new": tags_array,
                            "novel": []
                        }
                except json.JSONDecodeError:
                    console.print(f"[yellow]Warning: Could not parse JSON array: {response_text}[/yellow]")
            
            # Fallback: try to extract tags from the response text
            console.print(f"[yellow]Warning: Unexpected response format: {response_text}[/yellow]")
            return {"description": [], "existing": [], "new": [], "novel": []}
            
        except Exception as e:
            console.print(f"[red]Error calling Gemini API: {e}[/red]")
            return {"description": [], "existing": [], "new": [], "novel": []}

def update_post_tags(file_path: str, new_tags: List[str]) -> None:
    """Update the tags in a post's front matter."""
    try:
        post = frontmatter.load(file_path)
        
        # Get existing tags
        existing_tags = post.metadata.get("tags", [])
        if isinstance(existing_tags, str):
            existing_tags = [tag.strip() for tag in existing_tags.split(",")]
        elif not isinstance(existing_tags, list):
            existing_tags = []
        
        # Merge tags, ensuring no duplicates and sorting
        all_tags = list(set(existing_tags + new_tags))
        all_tags.sort()
        
        # Update the post
        post.metadata["tags"] = all_tags
        
        # Save back to file - handle potential bytes issue
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                frontmatter.dump(post, f)
        except TypeError as e:
            if "write() argument must be str, not bytes" in str(e):
                # Handle the bytes issue by converting to string first
                content = frontmatter.dumps(post)
                if isinstance(content, bytes):
                    content = content.decode('utf-8')
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            else:
                raise
        
        console.print(f"[green]✓ Updated tags for {file_path}[/green]")
        
    except Exception as e:
        console.print(f"[red]Error updating tags for {file_path}: {e}[/red]")

def display_suggested_tags(suggestions: Dict[str, Any], post_title: str, current_tags: List[str]) -> List[str]:
    """Display suggested tags in a nice format."""
    console.print(f"\n[bold blue]Post:[/bold blue] {post_title}")
    
    # Show image description if available
    if suggestions.get("description") and suggestions["description"]:
        console.print(f"\n[bold]Image description:[/bold] {suggestions['description'][0]}")
    
    # Get existing tags from current post tags
    existing_in_post = set(current_tags)
    
    # Categorize suggestions
    existing_suggestions = [tag for tag in suggestions["existing"] if tag in existing_in_post]
    new_suggestions = [tag for tag in suggestions["new"] if tag not in existing_in_post]
    novel_suggestions = suggestions["novel"]
    
    # Combine new suggestions (prioritizing existing taxonomy over novel)
    new_combined = []
    new_combined.extend(new_suggestions)
    new_combined.extend(novel_suggestions)
    
    # Always allow up to 5 new suggestions
    new_combined = new_combined[:5]
    
    # Show existing tags that are already in the post
    if existing_suggestions:
        console.print(f"\n[bold]Tags already in post:[/bold]")
        for tag in existing_suggestions:
            console.print(f"  [green]✓ {tag}[/green]")
    
    if new_combined:
        console.print(f"\n[bold]Suggested new tags (up to 5):[/bold]")
        for i, tag in enumerate(new_combined, 1):
            if tag in suggestions["new"]:
                console.print(f"  {i}. [yellow]{tag}[/yellow] (from taxonomy)")
            elif tag in suggestions["novel"]:
                console.print(f"  {i}. [red]{tag}[/red] (novel)")
        
        # Show what the final tag set would look like
        final_tags = list(set(current_tags + new_combined))
        final_tags.sort()
        console.print(f"\n[bold]Final tag set would be:[/bold] {', '.join(final_tags)}")
    else:
        console.print("[yellow]No new tags suggested[/yellow]")
    
    return new_combined

def select_tags_to_apply(suggestions: List[str]) -> List[str]:
    """Let user select which tags to apply."""
    if not suggestions:
        return []
    
    console.print(f"\n[bold]Select tags to apply (comma-separated numbers, or 'all' or 'none'):[/bold]")
    console.print("Example: 1,3,5 or 'all' or 'none'")
    
    while True:
        try:
            choice = input("Selection: ").strip().lower()
            
            if choice == "all":
                return suggestions
            elif choice == "none":
                return []
            elif choice == "":
                return []
            
            # Parse comma-separated numbers
            selected_indices = [int(x.strip()) for x in choice.split(",")]
            
            # Validate indices
            if all(1 <= i <= len(suggestions) for i in selected_indices):
                selected_tags = [suggestions[i-1] for i in selected_indices]
                return selected_tags
            else:
                console.print("[red]Invalid selection. Please try again.[/red]")
                
        except (ValueError, IndexError):
            console.print("[red]Invalid input. Please enter numbers separated by commas.[/red]")

def get_content_preview(content: str, max_lines: int = 5) -> str:
    """Extract the first N non-blank lines from content for preview."""
    lines = content.strip().split('\n')
    non_blank_lines = [line.strip() for line in lines if line.strip()]
    preview_lines = non_blank_lines[:max_lines]
    return '\n'.join(preview_lines)

@app.command()
def file(
    path: str = typer.Argument(..., help="Path to the content .md file.")
):
    """Analyze a single content file and suggest tags."""
    file_path = Path(path)
    if not file_path.exists():
        console.print(f"[red]Error: File {path} does not exist[/red]")
        sys.exit(1)
    
    try:
        # Load the post
        post = frontmatter.load(file_path)
        title = post.metadata.get("title", "Untitled")
        body = post.content
        
        # Check for image
        image_path = None
        if "image" in post.metadata:
            image_rel_path = post.metadata["image"]
            # Try different possible image paths
            possible_paths = [
                ROOT_DIR / "static" / image_rel_path,
                ROOT_DIR / "assets" / image_rel_path,
                ROOT_DIR / image_rel_path
            ]
            for img_path in possible_paths:
                if img_path.exists():
                    image_path = str(img_path)
                    break
        # If this is a photo post and no image field, infer from filename
        elif file_path.parent.name == "photo":
            # Try jpg and png extensions
            stem = file_path.stem
            possible_img_paths = [
                ROOT_DIR / "static" / "img" / "photo" / f"{stem}.jpg",
                ROOT_DIR / "static" / "img" / "photo" / f"{stem}.png",
                ROOT_DIR / "assets" / "img" / "photo" / f"{stem}.jpg",
                ROOT_DIR / "assets" / "img" / "photo" / f"{stem}.png"
            ]
            for img_path in possible_img_paths:
                if img_path.exists():
                    image_path = str(img_path)
                    break
        
        console.print(f"[bold]Analyzing:[/bold] {title}")
        
        # Show content preview
        if body.strip():
            preview = get_content_preview(body)
            console.print(f"\n[dim]Content preview:[/dim]")
            console.print(f"[dim]{preview}[/dim]")
        
        # Show image preview if available
        if image_path:
            console.print(f"\n[dim]Image file:[/dim] {image_path}")
        
        # Call Gemini API
        suggestions = call_gemini_api(body, image_path)
        
        # Display suggestions
        selected_tags = display_suggested_tags(suggestions, title, post.metadata.get("tags", []))
        
        if selected_tags:
            # Let user select which tags to apply
            tags_to_apply = select_tags_to_apply(selected_tags)
            if tags_to_apply:
                update_post_tags(str(file_path), tags_to_apply)
            else:
                console.print("[yellow]No tags selected[/yellow]")
        else:
            console.print("[yellow]No tags suggested[/yellow]")
            
    except Exception as e:
        console.print(f"[red]Error processing file {path}: {e}[/red]")
        sys.exit(1)

@app.command()
def interactive(
    tag_threshold: int = typer.Option(1, "--threshold", "-t", help="Find posts with this many tags or fewer."),
    content_type: str = typer.Option("all", "--type", help="Content type to scan: all, photo, post, highlight, note"),
    sort_by: str = typer.Option("missing", "--sort", help="Sort by: missing (fewest tags), asc (oldest first), desc (newest first), random")
):
    """Scan content directories and interactively suggest tags for posts with few tags."""
    
    # Validate content type
    valid_types = ["all", "photo", "post", "highlight", "note"]
    if content_type not in valid_types:
        console.print(f"[red]Error: Invalid content type '{content_type}'. Must be one of: {', '.join(valid_types)}[/red]")
        sys.exit(1)
    
    # Validate sort option
    valid_sorts = ["missing", "asc", "desc", "random"]
    if sort_by not in valid_sorts:
        console.print(f"[red]Error: Invalid sort option '{sort_by}'. Must be one of: {', '.join(valid_sorts)}[/red]")
        sys.exit(1)
    
    posts_to_review = []
    
    # Determine which content types to scan
    content_types_to_scan = [content_type] if content_type != "all" else ["post", "photo", "highlight", "note"]
    
    # Walk through content directories
    for content_type_dir in content_types_to_scan:
        content_path = CONTENT_DIR / content_type_dir
        if not content_path.exists():
            continue
            
        console.print(f"[dim]Scanning {content_type_dir} directory...[/dim]")
        
        for md_file in content_path.rglob("*.md"):
            try:
                post = frontmatter.load(md_file)
                tags = post.metadata.get("tags", [])
                
                if isinstance(tags, str):
                    tags = [tag.strip() for tag in tags.split(",")]
                elif not isinstance(tags, list):
                    tags = []
                
                if len(tags) <= tag_threshold:
                    # Get date for sorting
                    date_str = post.metadata.get("date", "")
                    if isinstance(date_str, str) and date_str:
                        try:
                            date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                        except:
                            date_obj = None
                    else:
                        date_obj = None
                    
                    posts_to_review.append({
                        "path": str(md_file),
                        "title": post.metadata.get("title", "Untitled"),
                        "content": post.content,
                        "image": post.metadata.get("image"),
                        "current_tags": tags,
                        "date": date_obj,
                        "content_type": content_type_dir
                    })
                    
            except Exception as e:
                console.print(f"[yellow]Warning: Could not parse {md_file}: {e}[/yellow]")
    
    if not posts_to_review:
        console.print(f"[green]No posts found with {tag_threshold} or fewer tags![/green]")
        return
    
    # Sort posts based on user preference
    if sort_by == "missing":
        posts_to_review.sort(key=lambda x: len(x["current_tags"]))
    elif sort_by == "asc":
        posts_to_review.sort(key=lambda x: x["date"] if x["date"] else datetime.min)
    elif sort_by == "desc":
        posts_to_review.sort(key=lambda x: x["date"] if x["date"] else datetime.min, reverse=True)
    elif sort_by == "random":
        import random
        random.shuffle(posts_to_review)
    
    console.print(f"\n[bold]Found {len(posts_to_review)} posts to review[/bold]")
    console.print(f"[dim]Content type: {content_type}, Sort: {sort_by}, Threshold: {tag_threshold}[/dim]")
    
    for i, post_data in enumerate(posts_to_review, 1):
        console.print(f"\n[bold cyan]Post {i}/{len(posts_to_review)}[/bold cyan]")
        console.print(f"[bold]Title:[/bold] {post_data['title']}")
        console.print(f"[dim]Type:[/dim] {post_data['content_type']}")
        console.print(f"[dim]Current tags:[/dim] {', '.join(post_data['current_tags']) if post_data['current_tags'] else 'None'}")
        
        # Check for image
        image_path = None
        if post_data["image"]:
            image_rel_path = post_data["image"]
            possible_paths = [
                ROOT_DIR / "static" / image_rel_path,
                ROOT_DIR / "assets" / image_rel_path,
                ROOT_DIR / image_rel_path
            ]
            for img_path in possible_paths:
                if img_path.exists():
                    image_path = str(img_path)
                    break
        
        # If this is a photo post and no image field, infer from filename
        elif post_data["content_type"] == "photo":
            file_path = Path(post_data["path"])
            stem = file_path.stem
            possible_img_paths = [
                ROOT_DIR / "static" / "img" / "photo" / f"{stem}.jpg",
                ROOT_DIR / "static" / "img" / "photo" / f"{stem}.png",
                ROOT_DIR / "assets" / "img" / "photo" / f"{stem}.jpg",
                ROOT_DIR / "assets" / "img" / "photo" / f"{stem}.png"
            ]
            for img_path in possible_img_paths:
                if img_path.exists():
                    image_path = str(img_path)
                    break
        
        # Show content preview
        if post_data["content"].strip():
            preview = get_content_preview(post_data["content"])
            console.print(f"\n[dim]Content preview:[/dim]")
            console.print(f"[dim]{preview}[/dim]")
        
        # Show image file if available
        if image_path:
            console.print(f"\n[dim]Image file:[/dim] {image_path}")
        
        # Call Gemini API
        suggestions = call_gemini_api(post_data["content"], image_path)
        
        # Display suggestions
        selected_tags = display_suggested_tags(suggestions, post_data["title"], post_data["current_tags"])
        
        if selected_tags:
            # Let user select which tags to apply
            tags_to_apply = select_tags_to_apply(selected_tags)
            if tags_to_apply:
                update_post_tags(post_data["path"], tags_to_apply)
            else:
                console.print("[yellow]No tags selected[/yellow]")
        else:
            console.print("[yellow]No tags suggested[/yellow]")
        
        # Ask if user wants to continue
        if i < len(posts_to_review):
            if not Confirm.ask("Continue to next post?"):
                break

@app.callback(invoke_without_command=True)
@app.command()
def default(
    ctx: typer.Context,
    tag_threshold: int = typer.Option(1, "--threshold", "-t", help="Find posts with this many tags or fewer."),
    content_type: str = typer.Option("all", "--type", help="Content type to scan: all, photo, post, highlight, note"),
    sort_by: str = typer.Option("missing", "--sort", help="Sort by: missing (fewest tags), asc (oldest first), desc (newest first), random")
):
    """Tag content using AI. Defaults to interactive mode."""
    if ctx.invoked_subcommand is None:
        # No subcommand was invoked, run interactive mode
        interactive(tag_threshold, content_type, sort_by)

if __name__ == "__main__":
    app() 