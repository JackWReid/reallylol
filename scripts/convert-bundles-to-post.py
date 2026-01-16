#!/usr/bin/env python3
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POST_DIR = ROOT / "content" / "post"


def is_empty_bundle(bundle_dir: Path) -> bool:
    """Check if a bundle directory only contains index.md."""
    if not bundle_dir.is_dir():
        return False
    
    # Check for index.md
    index_md = bundle_dir / "index.md"
    if not index_md.exists():
        return False
    
    # List all files in the directory (excluding hidden files)
    files = [f for f in bundle_dir.iterdir() if f.is_file() and not f.name.startswith('.')]
    
    # Only index.md should be present
    return len(files) == 1 and index_md in files


def list_empty_bundles():
    """Scan POST_DIR for bundle directories that only contain index.md."""
    bundles = []
    for item in sorted(POST_DIR.iterdir()):
        if item.is_dir() and is_empty_bundle(item):
            bundles.append(item)
    return bundles


def convert_bundle(bundle_dir: Path):
    """Convert a bundle directory to a flat post file."""
    bundle_dir = bundle_dir.resolve()
    index_md = bundle_dir / "index.md"
    
    if not index_md.exists():
        raise RuntimeError(f"index.md not found in {bundle_dir}")
    
    # Generate the target filename from the bundle directory name
    target_file = POST_DIR / f"{bundle_dir.name}.md"
    
    if target_file.exists():
        raise RuntimeError(f"Target file already exists: {target_file}")
    
    # Move index.md to the parent directory with the bundle name
    shutil.move(str(index_md), str(target_file))
    
    # Delete the now-empty bundle directory
    bundle_dir.rmdir()
    
    print(f"Converted bundle to post: {target_file.relative_to(ROOT)}")


def pick_bundle_interactively(bundles):
    """Allow user to select a bundle interactively using fzf or a simple menu."""
    if not bundles:
        print("No empty bundles found.")
        sys.exit(0)
    
    entries = []
    for bundle in bundles:
        entries.append(str(bundle.relative_to(ROOT)))
    
    fzf = shutil.which('fzf')
    if fzf:
        prompt = 'Convert bundle> '
        proc = subprocess.run(
            [fzf, '--prompt', prompt, '--header', '[ENTER] convert bundle | Only shows bundles with only index.md'],
            input='\n'.join(entries), text=True, capture_output=True)
        if proc.returncode != 0 or not proc.stdout.strip():
            print('No selection made.')
            sys.exit(0)
        selected_path = proc.stdout.strip()
        return [ROOT / selected_path]
    else:
        for idx, entry in enumerate(entries, 1):
            print(f"{idx}. {entry}")
        choice = input('Select a bundle number (or "all" for all): ').strip()
        if choice.lower() == 'all':
            return bundles
        if not choice.isdigit():
            print('Invalid selection.')
            sys.exit(1)
        idx = int(choice) - 1
        if idx < 0 or idx >= len(bundles):
            print('Selection out of range.')
            sys.exit(1)
        return [bundles[idx]]


def main():
    parser = argparse.ArgumentParser(description='Convert post bundles back to flat post files.')
    parser.add_argument('--slug', help='Bundle slug or directory name to convert')
    parser.add_argument('--path', help='Path to the bundle directory to convert')
    parser.add_argument('--all', action='store_true', help='Convert all empty bundles')
    args = parser.parse_args()

    bundles = list_empty_bundles()

    targets = []
    if args.all:
        targets = bundles
        if not targets:
            print('No empty bundles found to convert.')
            return
    elif args.path:
        bundle_path = ROOT / args.path if not Path(args.path).is_absolute() else Path(args.path)
        if is_empty_bundle(bundle_path):
            targets = [bundle_path]
        else:
            print(f"Error: {bundle_path} is not an empty bundle (contains files other than index.md).", file=sys.stderr)
            sys.exit(1)
    elif args.slug:
        bundle_path = POST_DIR / args.slug
        if is_empty_bundle(bundle_path):
            targets = [bundle_path]
        else:
            print(f"Error: {bundle_path} is not an empty bundle (contains files other than index.md).", file=sys.stderr)
            sys.exit(1)
    else:
        if not bundles:
            print('No empty bundles found.')
            return
        targets = pick_bundle_interactively(bundles)

    for target in targets:
        try:
            convert_bundle(target)
        except Exception as e:
            print(f"Error converting {target}: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == '__main__':
    main()