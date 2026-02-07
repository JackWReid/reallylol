#!/usr/bin/env python3
"""Unified sync script for really.lol data sources.

Subcommands:
    books   Sync book data from Hardcover via cover CLI
    films   Sync film data from a Letterboxd CSV export
    links   Sync links from Raindrop.io API
    photos  Rebuild random photo pool from content/photo/ frontmatter
    all     Run books + links + photos (everything except films)
"""

import argparse
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def write_compact_json(data: list, path: Path) -> None:
    """Write JSON array with one object per line for readable git diffs."""
    with open(path, "w", encoding="utf-8") as f:
        if not data:
            f.write("[]\n")
            return
        f.write("[\n")
        for i, item in enumerate(data):
            line = json.dumps(item, ensure_ascii=False)
            suffix = "," if i < len(data) - 1 else ""
            f.write(f"{line}{suffix}\n")
        f.write("]\n")


# --- Books ---


def sync_books(_args: argparse.Namespace) -> None:
    """Sync book data from Hardcover via the cover CLI."""
    if not shutil.which("cover"):
        print("Error: cover CLI not found. Install from https://github.com/jackreid/cover")
        sys.exit(1)

    if not os.environ.get("HARDCOVER_API_KEY"):
        print("Error: HARDCOVER_API_KEY environment variable not set")
        sys.exit(1)

    books_dir = ROOT / "data" / "books"
    books_dir.mkdir(parents=True, exist_ok=True)

    for shelf in ("toread", "reading", "read"):
        print(f"  Fetching {shelf}...")
        result = subprocess.run(
            ["cover", "list", shelf, "--blog"],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"Error: Failed to fetch '{shelf}' list")
            sys.exit(1)

        output = result.stdout.strip()
        if "No books found" in output:
            data = []
        else:
            data = json.loads(output)

        write_compact_json(data, books_dir / f"{shelf}.json")
        print(f"  {shelf}.json ({len(data)} books)")

    print("Books sync complete.")


# --- Films ---


def sync_films(args: argparse.Namespace) -> None:
    """Sync film data from a Letterboxd CSV export directory."""
    export_path = Path(args.export_path)
    if not export_path.is_dir():
        print(f"Error: Export directory not found: {export_path}")
        sys.exit(1)

    watchlist_csv = export_path / "watchlist.csv"
    diary_csv = export_path / "diary.csv"

    for f in (watchlist_csv, diary_csv):
        if not f.exists():
            print(f"Error: {f.name} not found in {export_path}")
            sys.exit(1)

    films_dir = ROOT / "data" / "films"
    films_dir.mkdir(parents=True, exist_ok=True)

    # watchlist.csv → towatch.json
    towatch = []
    with open(watchlist_csv, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("Date", "").strip():
                towatch.append(
                    {
                        "name": row["Name"],
                        "year": row.get("Year", ""),
                        "date_updated": row["Date"],
                    }
                )
    towatch.sort(key=lambda x: x["date_updated"], reverse=True)
    write_compact_json(towatch, films_dir / "towatch.json")

    # diary.csv → watched.json
    # Original SQL: SELECT ... [Watched Date] as date_updated ... ORDER BY Date DESC
    # "Date" is the diary log date; "Watched Date" is the actual watch date
    watched = []
    with open(diary_csv, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            watched_date = row.get("Watched Date", "").strip()
            if watched_date:
                watched.append(
                    {
                        "name": row["Name"],
                        "year": row.get("Year", ""),
                        "date_updated": watched_date,
                        "_sort": row.get("Date", ""),
                    }
                )
    watched.sort(key=lambda x: x["_sort"], reverse=True)
    for item in watched:
        del item["_sort"]
    write_compact_json(watched, films_dir / "watched.json")

    print("Films sync complete:")
    print(f"  towatch.json ({len(towatch)} films)")
    print(f"  watched.json ({len(watched)} films)")


# --- Links ---


def sync_links(args: argparse.Namespace) -> None:
    """Sync links from Raindrop.io API."""
    token = None
    token_file = ROOT / "creds" / "raindrop-token"

    if token_file.exists():
        token = token_file.read_text().strip()
        if token:
            print(f"  Using token from {token_file.relative_to(ROOT)}")

    if not token:
        token = os.environ.get("RAINDROP_ACCESS_TOKEN", "").strip()
        if token:
            print("  Using token from RAINDROP_ACCESS_TOKEN")

    if not token:
        print("Error: Raindrop access token not found")
        print(f"  Checked: {token_file}")
        print("  Checked: RAINDROP_ACCESS_TOKEN env var")
        sys.exit(1)

    tag = args.tag
    per_page = 50
    all_items = []
    page = 0

    print(f"  Fetching links with tag: {tag}...")

    while True:
        encoded_tag = urllib.parse.quote(tag)
        url = (
            f"https://api.raindrop.io/rest/v1/raindrops/0"
            f"?search=%23{encoded_tag}&page={page}&perpage={per_page}"
        )

        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 401:
                print("Error: Authentication failed (401). Check your token.")
            elif e.code == 429:
                print("Error: Rate limit exceeded (429). Try again later.")
            else:
                print(f"Error: API request failed with HTTP {e.code}")
            sys.exit(1)

        items = data.get("items", [])
        if not items:
            break

        for item in items:
            all_items.append(
                {
                    "title": item.get("title") or item.get("domain", "Untitled"),
                    "url": item.get("link", ""),
                    "date": (
                        item.get("created", "").split("T")[0]
                        if item.get("created")
                        else ""
                    ),
                    "excerpt": item.get("excerpt", ""),
                    "tags": item.get("tags", []),
                    "cover": item.get("cover", ""),
                }
            )

        if len(items) < per_page:
            break
        page += 1

    all_items.sort(key=lambda x: x["date"], reverse=True)

    data_dir = ROOT / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    write_compact_json(all_items, data_dir / "links.json")

    print("Links sync complete:")
    print(f"  links.json ({len(all_items)} links)")


# --- Photos ---


def parse_tags_from_frontmatter(text: str) -> list[str]:
    """Extract tags from YAML frontmatter."""
    if not text.startswith("---"):
        return []
    parts = text.split("---", 2)
    if len(parts) < 3:
        return []
    fm = parts[1]

    # Inline array: tags: [tag1, tag2]
    inline = re.search(r"^tags:\s*\[([^\]]*)\]", fm, re.MULTILINE)
    if inline:
        raw = inline.group(1)
        return [t.strip().strip("'\"") for t in raw.split(",") if t.strip()]

    # YAML list: tags:\n  - tag1\n  - tag2
    list_match = re.search(r"^tags:\s*\n((?:\s+-\s+.+\n?)+)", fm, re.MULTILINE)
    if list_match:
        block = list_match.group(1)
        return [
            line.strip().lstrip("- ").strip().strip("'\"")
            for line in block.splitlines()
            if line.strip().startswith("-")
        ]

    return []


def sync_photos(_args: argparse.Namespace) -> None:
    """Rebuild random photo pool from content/photo/ frontmatter."""
    config_path = ROOT / "data" / "content_config.json"
    if not config_path.exists():
        print(f"Error: {config_path.relative_to(ROOT)} not found")
        sys.exit(1)

    config = json.loads(config_path.read_text())
    exclude_tags = {t.lower() for t in config.get("exclude_tags", [])}

    photo_dir = ROOT / "content" / "photo"
    if not photo_dir.exists():
        print("Error: content/photo/ not found")
        sys.exit(1)

    photos = sorted(photo_dir.glob("*.md"))
    if not photos:
        print("No photo files found in content/photo/")
        sys.exit(1)

    eligible = []
    for i, photo_file in enumerate(photos):
        if (i + 1) % 100 == 0 or i + 1 == len(photos):
            print(f"\r  Scanning photos: {i + 1}/{len(photos)}", end="", flush=True)

        text = photo_file.read_text(encoding="utf-8")
        tags = parse_tags_from_frontmatter(text)
        normalised = {t.lower() for t in tags}

        if not normalised & exclude_tags:
            eligible.append({"path": f"photo/{photo_file.stem}"})

    print()

    write_compact_json(eligible, ROOT / "data" / "random_photos.json")

    print("Photos sync complete:")
    print(f"  random_photos.json ({len(eligible)} eligible photos)")


# --- All ---


def sync_all(args: argparse.Namespace) -> None:
    """Run all sync operations except films (which needs an export path)."""
    print("=== Books ===")
    sync_books(args)
    print()
    print("=== Links ===")
    sync_links(args)
    print()
    print("=== Photos ===")
    sync_photos(args)


# --- CLI ---


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sync data sources for really.lol",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("books", help="Sync book data from Hardcover")

    films_p = sub.add_parser("films", help="Sync film data from Letterboxd export")
    films_p.add_argument(
        "export_path", help="Path to extracted Letterboxd export directory"
    )

    links_p = sub.add_parser("links", help="Sync links from Raindrop.io")
    links_p.add_argument(
        "--tag",
        default=os.environ.get("RAINDROP_TAG", "toblog"),
        help="Tag to filter by (default: toblog)",
    )

    sub.add_parser("photos", help="Rebuild random photo pool")

    all_p = sub.add_parser("all", help="Run books + links + photos")
    all_p.add_argument(
        "--tag",
        default=os.environ.get("RAINDROP_TAG", "toblog"),
        help="Raindrop tag to filter by (default: toblog)",
    )

    args = parser.parse_args()

    commands = {
        "books": sync_books,
        "films": sync_films,
        "links": sync_links,
        "photos": sync_photos,
        "all": sync_all,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
