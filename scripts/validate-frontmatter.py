#!/usr/bin/env python3
"""Validate frontmatter of Hugo content files.

Reads file paths from stdin (one per line) and validates each.
Exits 0 if all valid, 1 if any issues found.
"""

import re
import sys
from pathlib import Path

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}")


def validate_file(path: Path) -> list[str]:
    """Return a list of issues found in the file's frontmatter."""
    issues = []

    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return [f"File not found: {path}"]

    if not text.startswith("---"):
        issues.append("Missing frontmatter (no opening ---)")
        return issues

    parts = text.split("---", 2)
    if len(parts) < 3:
        issues.append("Malformed frontmatter (no closing ---)")
        return issues

    fm = parts[1]

    # Check for title
    title_match = re.search(r"^title:\s*(.+)", fm, re.MULTILINE)
    if not title_match:
        issues.append("Missing 'title' field")
    elif not title_match.group(1).strip().strip("'\""):
        issues.append("Empty 'title' field")

    # Check for date
    date_match = re.search(r"^date:\s*(.+)", fm, re.MULTILINE)
    if not date_match:
        issues.append("Missing 'date' field")
    elif not DATE_RE.match(date_match.group(1).strip().strip("'\"").strip()):
        issues.append(f"Unparseable 'date': {date_match.group(1).strip()}")

    # Photo-specific: check for image field (skip section index pages)
    if "/photo/" in str(path) and "_index" not in path.name:
        image_match = re.search(r"^image:\s*(.+)", fm, re.MULTILINE)
        if not image_match:
            issues.append("Photo missing 'image' field")

    return issues


def main() -> None:
    paths = [line.strip() for line in sys.stdin if line.strip()]

    if not paths:
        return

    errors = 0
    for path_str in paths:
        path = Path(path_str)
        issues = validate_file(path)
        if issues:
            errors += 1
            print(f"  {path_str}:")
            for issue in issues:
                print(f"    - {issue}")

    if errors:
        print(f"\n  {errors} file(s) with frontmatter issues")
        sys.exit(1)


if __name__ == "__main__":
    main()
