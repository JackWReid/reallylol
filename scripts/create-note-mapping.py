#!/usr/bin/env python3
"""
Note File Mapping Generator

This script reads all note files from content/note/ directory, extracts titles from frontmatter,
generates descriptive slugs, and creates a mapping for renaming files to a consistent format.

Usage: python scripts/create-note-mapping.py
"""

import os
import re
import json
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Optional


def extract_frontmatter(file_path: str) -> Dict:
    """Extract YAML frontmatter from a markdown file using simple parsing."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file starts with frontmatter
        if not content.startswith('---'):
            return {}
        
        # Find the end of frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            return {}
        
        frontmatter_content = parts[1].strip()
        
        # Simple YAML parsing for our specific use case
        frontmatter = {}
        for line in frontmatter_content.split('\n'):
            line = line.strip()
            if ':' in line and not line.startswith('#'):
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                
                # Remove quotes from value if present
                if value.startswith('"') and value.endswith('"'):
                    value = value[1:-1]
                elif value.startswith("'") and value.endswith("'"):
                    value = value[1:-1]
                
                frontmatter[key] = value
        
        return frontmatter
    
    except Exception as e:
        print(f"Warning: Could not parse frontmatter in {file_path}: {e}")
        return {}


def extract_date_from_filename(filename: str) -> Optional[str]:
    """Extract date from filename and return in YYYY-MM-DD format."""
    # Remove .md extension
    name = filename.replace('.md', '')
    
    # Pattern 1: YYYY-MM-DD (already correct format)
    if re.match(r'^\d{4}-\d{2}-\d{2}', name):
        return name[:10]
    
    # Pattern 2: YYYY-MM-DDTHH-MM-SS or YYYY-MM-DDTHH:MM:SS
    match = re.match(r'^(\d{4})-(\d{2})-(\d{2})T', name)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    
    # Pattern 3: YYYY-MM-DDTHH:MM:SS.sssZ (ISO format)
    match = re.match(r'^(\d{4})-(\d{2})-(\d{2})T.*Z', name)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    
    print(f"Warning: Could not extract date from filename: {filename}")
    return None


def create_slug(title: str) -> str:
    """Create a URL-friendly slug from a title."""
    if not title:
        return ""
    
    # Convert to lowercase
    slug = title.lower()
    
    # Remove quotes and other punctuation, but keep some meaningful characters temporarily
    slug = re.sub(r'["""''`]', '', slug)
    
    # Replace spaces, slashes, and other separators with hyphens
    slug = re.sub(r'[\s/\\]+', '-', slug)
    
    # Replace other punctuation with hyphens, but be selective
    slug = re.sub(r'[^\w\-]', '-', slug)
    
    # Remove multiple consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    
    # Limit length to reasonable size
    if len(slug) > 50:
        slug = slug[:50].rstrip('-')
    
    return slug


def generate_mapping(notes_dir: str) -> Dict[str, Dict]:
    """Generate mapping of old filename to new filename and metadata."""
    mapping = {}
    slug_counts = defaultdict(int)
    
    # Get all markdown files
    note_files = []
    for file in os.listdir(notes_dir):
        if file.endswith('.md') and file != '_index.md':
            note_files.append(file)
    
    # Sort files for consistent processing
    note_files.sort()
    
    print(f"Processing {len(note_files)} note files...")
    
    for filename in note_files:
        file_path = os.path.join(notes_dir, filename)
        
        # Extract frontmatter
        frontmatter = extract_frontmatter(file_path)
        
        # Get title
        title = frontmatter.get('title', '').strip()
        if isinstance(title, str):
            title = title.strip('"\'')  # Remove surrounding quotes
        
        # Get date from filename
        date_str = extract_date_from_filename(filename)
        
        # Create slug from title
        slug = create_slug(title) if title else ""
        
        # Handle missing or empty slug
        if not slug:
            if title:
                slug = "untitled"
            else:
                slug = "no-title"
        
        # Handle duplicate slugs
        if slug in slug_counts:
            slug_counts[slug] += 1
            slug = f"{slug}-{slug_counts[slug]}"
        else:
            slug_counts[slug] = 0
        
        # Generate new filename
        if date_str:
            new_filename = f"{date_str}-{slug}.md"
        else:
            # If we can't extract date, use current filename structure
            new_filename = filename
        
        # Check if filename needs changing
        needs_rename = filename != new_filename
        
        # Store mapping
        mapping[filename] = {
            'new_filename': new_filename,
            'title': title,
            'date': date_str,
            'slug': slug,
            'needs_rename': needs_rename,
            'frontmatter_date': frontmatter.get('date', ''),
            'has_title': bool(title),
            'original_slug': create_slug(title) if title else ""
        }
    
    return mapping


def print_summary(mapping: Dict[str, Dict]):
    """Print a summary of the mapping results."""
    total_files = len(mapping)
    needs_rename = sum(1 for data in mapping.values() if data['needs_rename'])
    has_title = sum(1 for data in mapping.values() if data['has_title'])
    missing_title = total_files - has_title
    
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"Total files processed: {total_files}")
    print(f"Files that need renaming: {needs_rename}")
    print(f"Files with titles: {has_title}")
    print(f"Files missing titles: {missing_title}")
    
    if missing_title > 0:
        print(f"\nFiles missing titles:")
        for filename, data in mapping.items():
            if not data['has_title']:
                print(f"  - {filename}")
    
    print(f"\nExample mappings:")
    count = 0
    for filename, data in mapping.items():
        if data['needs_rename'] and count < 5:
            print(f"  {filename} -> {data['new_filename']}")
            count += 1
    
    if needs_rename > 5:
        print(f"  ... and {needs_rename - 5} more")


def save_mapping(mapping: Dict[str, Dict], output_file: str):
    """Save the mapping to a JSON file."""
    # Create a more readable format for the JSON
    formatted_mapping = {}
    for old_name, data in mapping.items():
        formatted_mapping[old_name] = {
            'new_filename': data['new_filename'],
            'title': data['title'],
            'date': data['date'],
            'slug': data['slug'],
            'needs_rename': data['needs_rename']
        }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(formatted_mapping, f, indent=2, ensure_ascii=False)
    
    print(f"\nMapping saved to: {output_file}")


def save_rename_script(mapping: Dict[str, Dict], script_file: str):
    """Save a bash script for performing the renames."""
    with open(script_file, 'w', encoding='utf-8') as f:
        f.write("#!/bin/bash\n")
        f.write("# Auto-generated script to rename note files\n")
        f.write("# Review this script before running!\n\n")
        f.write("set -e\n")
        f.write("cd \"$(dirname \"$0\")\"/../content/note\n\n")
        
        for old_name, data in mapping.items():
            if data['needs_rename']:
                f.write(f"# {data['title'][:50]}{'...' if len(data['title']) > 50 else ''}\n")
                f.write(f"mv \"{old_name}\" \"{data['new_filename']}\"\n\n")
    
    # Make script executable
    os.chmod(script_file, 0o755)
    print(f"Rename script saved to: {script_file}")


def main():
    """Main function."""
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    notes_dir = project_root / "content" / "note"
    
    if not notes_dir.exists():
        print(f"Error: Notes directory not found at {notes_dir}")
        return
    
    print(f"Scanning notes directory: {notes_dir}")
    
    # Generate mapping
    mapping = generate_mapping(str(notes_dir))
    
    # Print summary
    print_summary(mapping)
    
    # Save mapping file
    mapping_file = script_dir / "note-mapping.json"
    save_mapping(mapping, str(mapping_file))
    
    # Save rename script
    rename_script = script_dir / "rename-notes.sh"
    save_rename_script(mapping, str(rename_script))
    
    print(f"\n{'='*60}")
    print("FILES CREATED:")
    print(f"- {mapping_file} - Complete mapping data (JSON)")
    print(f"- {rename_script} - Executable bash script for renaming")
    print("")
    print("Next steps:")
    print("1. Review the mapping in note-mapping.json")
    print("2. Review the rename script in rename-notes.sh")
    print("3. Run the rename script when ready:")
    print("   ./scripts/rename-notes.sh")
    print("")
    print("The script handles:")
    print("- Date extraction from various filename formats")
    print("- Title extraction from frontmatter")
    print("- Slug generation (lowercase, hyphens, max 50 chars)")
    print("- Duplicate slug detection and numbering")
    print("- Comprehensive error handling and reporting")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()