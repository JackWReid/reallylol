#!/usr/bin/env python3
"""Normalise content tags across site/src/content/.

Applies the agreed taxonomy cleanup:
- kebab-case for compressed / spaced / abbreviated tags
- plural form wins for subject tags
- cinema cluster -> 'film'
- split botched 'landscape italy' compound
- type markers left untouched
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site" / "src" / "content"
COLLECTIONS = ["blog", "highlight", "photo"]

# 1:1 renames
RENAMES: dict[str, str] = {
    # compressed -> kebab
    "sanfrancisco": "san-francisco",
    "losangeles": "los-angeles",
    "lasvegas": "las-vegas",
    "middleeast": "middle-east",
    "filmphotography": "film-photography",
    "domesticabuse": "domestic-abuse",
    "indieweb": "indie-web",
    "metoo": "me-too",
    # abbreviation -> expanded kebab
    "nyc": "new-york-city",
    "NYC": "new-york-city",
    "sf": "san-francisco",
    "bw": "black-and-white",
    "bandw": "black-and-white",
    # spaced -> kebab
    "peak district": "peak-district",
    "south bank": "south-bank",
    "oxford circus": "oxford-circus",
    "brockwell park": "brockwell-park",
    "mental health": "mental-health",
    "social media": "social-media",
    "internet culture": "internet-culture",
    # same-place merges
    "brockwell": "brockwell-park",
    # plural wins (subject tags)
    "city": "cities",
    "interior": "interiors",
    "animal": "animals",
    "dog": "dogs",
    "pet": "pets",
    "museum": "museums",
    "book": "books",
    "language": "languages",
    # cinema cluster -> film
    "films": "film",
    "movies": "film",
    "cinema": "film",
}

# Tags that split into multiple tags
SPLITS: dict[str, list[str]] = {
    "landscape italy": ["landscape", "italy"],
}

FRONTMATTER_RE = re.compile(r"^(---\n)(.*?)(\n---\n)", re.DOTALL)
# Match a YAML list under `tags:` (block style) or inline `tags: [..]`
TAGS_BLOCK_RE = re.compile(
    r"^(tags:[ \t]*\n)((?:[ \t]+-[ \t]+.*\n?)+)", re.MULTILINE
)
TAGS_INLINE_RE = re.compile(r"^tags:[ \t]*\[([^\]]*)\][ \t]*$", re.MULTILINE)
ITEM_RE = re.compile(r'^([ \t]+-[ \t]+)(?:"([^"]*)"|\'([^\']*)\'|(.+?))[ \t]*$')


def normalise_tag(tag: str) -> list[str]:
    """Return the new tag(s) for a given input tag."""
    if tag in SPLITS:
        return SPLITS[tag]
    return [RENAMES.get(tag, tag)]


def transform_block(match: re.Match[str]) -> str:
    header, body = match.group(1), match.group(2)
    trailing_nl = body.endswith("\n")
    out_lines: list[str] = []
    seen: set[str] = set()
    indent_quote: tuple[str, str] | None = None  # (indent prefix, quote char)
    for line in body.splitlines():
        m = ITEM_RE.match(line)
        if not m:
            out_lines.append(line)
            continue
        prefix = m.group(1)
        if m.group(2) is not None:
            tag = m.group(2)
            quote = '"'
        elif m.group(3) is not None:
            tag = m.group(3)
            quote = "'"
        else:
            tag = m.group(4)
            quote = ""
        if indent_quote is None:
            indent_quote = (prefix, quote)
        for new_tag in normalise_tag(tag):
            if new_tag in seen:
                continue
            seen.add(new_tag)
            ip, q = indent_quote
            if q:
                out_lines.append(f"{ip}{q}{new_tag}{q}")
            else:
                out_lines.append(f"{ip}{new_tag}")
    result = header + "\n".join(out_lines)
    if trailing_nl:
        result += "\n"
    return result


def transform_inline(match: re.Match[str]) -> str:
    raw = match.group(1)
    parts = [p.strip().strip('"').strip("'") for p in raw.split(",") if p.strip()]
    new_parts: list[str] = []
    seen: set[str] = set()
    for tag in parts:
        for new_tag in normalise_tag(tag):
            if new_tag in seen:
                continue
            seen.add(new_tag)
            new_parts.append(f'"{new_tag}"')
    return f"tags: [{', '.join(new_parts)}]"


def process_file(path: Path) -> tuple[bool, list[str]]:
    """Returns (changed, list of changes for reporting)."""
    text = path.read_text()
    fm_match = FRONTMATTER_RE.match(text)
    if not fm_match:
        return False, []
    fm_open, fm_body, fm_close = fm_match.group(1), fm_match.group(2), fm_match.group(3)

    original_body = fm_body
    new_body = TAGS_BLOCK_RE.sub(transform_block, fm_body)
    new_body = TAGS_INLINE_RE.sub(transform_inline, new_body)

    if new_body == original_body:
        return False, []

    new_text = fm_open + new_body + fm_close + text[fm_match.end():]
    path.write_text(new_text)

    # Build a diff summary of tag changes
    def extract_tags(body: str) -> list[str]:
        tags: list[str] = []
        block = TAGS_BLOCK_RE.search(body)
        if block:
            for line in block.group(2).splitlines():
                m = ITEM_RE.match(line)
                if m:
                    tags.append(m.group(2) or m.group(3) or m.group(4))
        inline = TAGS_INLINE_RE.search(body)
        if inline:
            tags.extend(
                p.strip().strip('"').strip("'")
                for p in inline.group(1).split(",")
                if p.strip()
            )
        return tags

    before = extract_tags(original_body)
    after_set = set(extract_tags(new_body))
    changes: list[str] = []
    for tag in before:
        new_tags = normalise_tag(tag)
        for new_tag in new_tags:
            if new_tag != tag:
                changes.append(f"  {tag!r} -> {new_tag!r}")
    return True, changes


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        # in dry-run we monkeypatch write_text
        Path.write_text = lambda self, data, **kw: None  # type: ignore[assignment]

    total_files = 0
    changed_files = 0
    tag_change_counts: dict[str, int] = {}

    for col in COLLECTIONS:
        col_dir = ROOT / col
        if not col_dir.is_dir():
            continue
        for md in sorted(col_dir.glob("*.md")):
            total_files += 1
            changed, changes = process_file(md)
            if changed:
                changed_files += 1
                rel = md.relative_to(ROOT)
                print(f"~ {rel}")
                for c in changes:
                    print(c)
                    tag_change_counts[c] = tag_change_counts.get(c, 0) + 1

    print()
    print(f"Scanned {total_files} files, modified {changed_files}.")
    print()
    print("Per-rename counts:")
    for c, n in sorted(tag_change_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {n:4d}  {c.strip()}")
    if dry_run:
        print("\n(dry run — no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
