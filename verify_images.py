#!/usr/bin/env python3
"""
Verify all image references in Hugo blog posts after consolidation.
Checks that all referenced images exist in static/img/
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def find_image_references(content_dir):
    """Find all image references in markdown files."""
    image_refs = defaultdict(list)
    
    # Patterns to match different image reference formats
    patterns = [
        # Hugo photo shortcode: {{<photo src="/img/filename.jpg">}}
        r'{{\s*<\s*photo\s+src\s*=\s*"([^"]+)"[^>]*>\s*}}',
        # Standard markdown: ![alt](/img/filename.jpg)
        r'!\[[^\]]*\]\(([^)]+)\)',
        # HTML img tags: <img src="/img/filename.jpg">
        r'<img[^>]+src\s*=\s*["\']([^"\']+)["\']',
    ]
    
    for root, dirs, files in os.walk(content_dir):
        for file in files:
            if file.endswith(('.md', '.markdown')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    for pattern in patterns:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        for match in matches:
                            # Normalize the path
                            img_path = match.strip()
                            if img_path:
                                image_refs[img_path].append(filepath)
                                
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
    
    return image_refs

def check_images_exist(image_refs, static_dir):
    """Check if referenced images exist in static directory."""
    missing_images = {}
    found_images = {}
    
    for img_ref, posts in image_refs.items():
        # Handle different path formats
        if img_ref.startswith('/img/'):
            # Path relative to static directory
            img_path = os.path.join(static_dir, img_ref[1:])
        elif img_ref.startswith('img/'):
            # Path relative to static directory without leading slash
            img_path = os.path.join(static_dir, img_ref)
        elif img_ref.startswith('/'):
            # Other absolute paths
            img_path = os.path.join(static_dir, img_ref[1:])
        else:
            # Relative paths or external URLs
            if img_ref.startswith(('http://', 'https://')):
                continue  # Skip external URLs
            img_path = os.path.join(static_dir, img_ref)
        
        if os.path.exists(img_path):
            found_images[img_ref] = posts
        else:
            missing_images[img_ref] = posts
    
    return found_images, missing_images

def main():
    """Main verification function."""
    # Paths
    workspace = Path('/workspace')
    content_dir = workspace / 'content'
    static_dir = workspace / 'static'
    
    print("Hugo Blog Image Verification Report")
    print("=" * 50)
    
    # Find all image references
    print("\n1. Scanning content for image references...")
    image_refs = find_image_references(content_dir)
    print(f"   Found {len(image_refs)} unique image references")
    
    # Check if images exist
    print("\n2. Checking if referenced images exist...")
    found_images, missing_images = check_images_exist(image_refs, static_dir)
    
    print(f"   ✓ Found: {len(found_images)} images")
    print(f"   ✗ Missing: {len(missing_images)} images")
    
    # Report missing images
    if missing_images:
        print("\n3. Missing Images Report:")
        print("-" * 50)
        for img_ref, posts in sorted(missing_images.items()):
            print(f"\n   Image: {img_ref}")
            print("   Referenced in:")
            for post in posts[:5]:  # Show first 5 posts
                rel_path = os.path.relpath(post, workspace)
                print(f"     - {rel_path}")
            if len(posts) > 5:
                print(f"     ... and {len(posts) - 5} more posts")
    
    # Summary statistics
    print("\n4. Summary Statistics:")
    print("-" * 50)
    
    # Count references by directory
    ref_by_dir = defaultdict(int)
    for img_ref in image_refs:
        if img_ref.startswith('/img/'):
            ref_by_dir['/img/'] += len(image_refs[img_ref])
        elif img_ref.startswith('/images/'):
            ref_by_dir['/images/'] += len(image_refs[img_ref])
        else:
            ref_by_dir['other'] += len(image_refs[img_ref])
    
    print("   References by path prefix:")
    for prefix, count in sorted(ref_by_dir.items()):
        print(f"     {prefix}: {count} references")
    
    # List actual images in static/img
    print("\n5. Images in static/img/:")
    print("-" * 50)
    img_dir = static_dir / 'img'
    if img_dir.exists():
        img_files = list(img_dir.rglob('*'))
        img_files = [f for f in img_files if f.is_file()]
        print(f"   Total files: {len(img_files)}")
        
        # Group by subdirectory
        by_subdir = defaultdict(list)
        for img_file in img_files:
            rel_path = img_file.relative_to(img_dir)
            subdir = rel_path.parts[0] if len(rel_path.parts) > 1 else 'root'
            by_subdir[subdir].append(img_file.name)
        
        for subdir, files in sorted(by_subdir.items()):
            if subdir == 'root':
                print(f"   In img/ root: {len(files)} files")
            else:
                print(f"   In img/{subdir}/: {len(files)} files")
    
    # Final recommendations
    if missing_images:
        print("\n6. Recommendations:")
        print("-" * 50)
        print("   - Review and fix missing image references")
        print("   - Consider removing or updating posts with broken images")
        if '/images/' in ref_by_dir:
            print("   - Some references use '/images/' instead of '/img/'")
            print("     Consider updating these references for consistency")

if __name__ == "__main__":
    main()