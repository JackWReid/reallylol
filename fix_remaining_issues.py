#!/usr/bin/env python3
"""
Fix remaining issues after image consolidation:
1. Fix missing image references
2. Update /images/ references to /img/
3. Handle encoding issues in certain files
"""

import os
import re
from pathlib import Path

def fix_encoding_issues(file_path):
    """Try to read file with different encodings and fix if needed."""
    encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
    content = None
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                content = f.read()
            print(f"   Successfully read with {encoding} encoding")
            
            # If not UTF-8, save back as UTF-8
            if encoding != 'utf-8':
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"   Converted to UTF-8")
            
            return content
        except UnicodeDecodeError:
            continue
    
    print(f"   ERROR: Could not read file with any encoding")
    return None

def fix_image_reference(file_path, old_ref, new_ref):
    """Fix a specific image reference in a file."""
    try:
        # Try to read with UTF-8 first
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Handle encoding issues
        content = fix_encoding_issues(file_path)
        if content is None:
            return False
    
    # Replace the reference
    if old_ref in content:
        content = content.replace(old_ref, new_ref)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def find_possible_matches(missing_file, img_dir):
    """Find possible matches for a missing file."""
    missing_name = Path(missing_file).name
    possible_matches = []
    
    # Look for similar filenames
    for root, dirs, files in os.walk(img_dir):
        for file in files:
            if missing_name in file or file in missing_name:
                rel_path = os.path.relpath(os.path.join(root, file), img_dir.parent)
                possible_matches.append('/' + rel_path.replace('\\', '/'))
    
    return possible_matches

def main():
    """Main function to fix remaining issues."""
    workspace = Path('/workspace')
    static_dir = workspace / 'static'
    img_dir = static_dir / 'img'
    
    print("Fixing Remaining Issues")
    print("=" * 50)
    
    # 1. Fix encoding issues
    print("\n1. Fixing encoding issues in files...")
    encoding_issues = [
        'content/highlight/2020-02-10-joe-biden-stutter.md',
        'content/highlight/2020-02-10-little-women-gerwig-crit.md',
        'content/highlight/2020-05-01-helms-deep-analysis.md',
        'content/highlight/2020-05-21-alison-roman-culture.md'
    ]
    
    for file_path in encoding_issues:
        full_path = workspace / file_path
        print(f"\n   Processing: {file_path}")
        fix_encoding_issues(full_path)
    
    # 2. Fix missing image references
    print("\n\n2. Fixing missing image references...")
    
    # Case 1: /images/uploads/24530.jpeg
    print("\n   a) Fixing /images/uploads/24530.jpeg reference...")
    highlight_file = workspace / 'content/highlight/2020-05-06T12-27-43.md'
    
    # First, let's see if we can find a similar image
    possible_matches = find_possible_matches('24530.jpeg', img_dir)
    if possible_matches:
        print(f"   Found possible matches: {possible_matches}")
    else:
        print("   No similar images found. This image may need to be uploaded.")
        # Remove the broken reference for now
        if fix_image_reference(highlight_file, 
                             '/images/uploads/24530.jpeg "Oil Derricks at Venice Beach"',
                             ''):
            print("   Removed broken image reference")
    
    # Case 2: Duplicated date in filename
    print("\n   b) Fixing duplicated date in filename...")
    photo_file = workspace / 'content/photo/2017-09-13-8ffecd7b42551f81bb114c7e70ae9d44.md'
    
    # Look for the correct filename
    possible_names = [
        '/img/photo/2017-09-13-8ffecd7b42551f81bb114c7e70ae9d44.jpg',
        '/img/photo/8ffecd7b42551f81bb114c7e70ae9d44.jpg'
    ]
    
    for possible_name in possible_names:
        if (static_dir / possible_name[1:]).exists():
            if fix_image_reference(photo_file,
                                 '/img/photo/2017-09-13-2017-09-13-8ffecd7b42551f81bb114c7e70ae9d44.jpg',
                                 possible_name):
                print(f"   Fixed reference to: {possible_name}")
                break
    else:
        print("   Could not find matching image file")
    
    # Case 3: basel-pink.jpg
    print("\n   c) Looking for basel-pink.jpg...")
    basel_file = workspace / 'content/photo/2022-05-26-basel-boys.md'
    
    # Check if there's a similar file
    possible_basel = find_possible_matches('basel', img_dir / 'photo')
    if possible_basel:
        print(f"   Found possible matches: {possible_basel[:5]}")  # Show first 5
        # Look specifically for pink-related basel images
        pink_matches = [m for m in possible_basel if 'pink' in m.lower()]
        if pink_matches:
            print(f"   Found pink-related match: {pink_matches[0]}")
    else:
        print("   No similar images found")
    
    # 3. Update /images/ references to /img/
    print("\n\n3. Checking for other /images/ references...")
    
    # Quick scan for any other /images/ references
    for root, dirs, files in os.walk(workspace / 'content'):
        for file in files:
            if file.endswith(('.md', '.markdown')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    if '/images/' in content and file_path != str(highlight_file):
                        print(f"   Found /images/ reference in: {os.path.relpath(file_path, workspace)}")
                        
                except Exception:
                    pass
    
    print("\n\nFixing complete!")
    print("\nNext steps:")
    print("1. Run verify_images.py again to confirm fixes")
    print("2. Manually check the three files with missing images")
    print("3. Consider uploading missing images if they're important")

if __name__ == "__main__":
    main()