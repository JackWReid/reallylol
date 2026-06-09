#!/usr/bin/env python3
"""Kebab-case the remaining compressed/spaced type-marker tags."""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site" / "src" / "content"
COLLECTIONS = ["blog", "highlight", "photo"]

RENAMES: dict[str, str] = {
    "watchedmovie": "watched-movie",
    "readbook": "read-book",
    "medialog": "media-log",
    "short story": "short-story",
    "written by me": "written-by-me",
    "best of": "best-of",
    "best of year": "best-of-year",
    "best of 2020": "best-of-2020",
}

FRONTMATTER_RE = re.compile(r"^(---\n)(.*?)(\n---\n)", re.DOTALL)
TAGS_BLOCK_RE = re.compile(r"^(tags:[ \t]*\n)((?:[ \t]+-[ \t]+.*\n?)+)", re.MULTILINE)
ITEM_RE = re.compile(r'^([ \t]+-[ \t]+)(?:"([^"]*)"|\'([^\']*)\'|(.+?))[ \t]*$')


def transform(match: re.Match[str]) -> str:
    header, body = match.group(1), match.group(2)
    trailing_nl = body.endswith("\n")
    out_lines: list[str] = []
    seen: set[str] = set()
    for line in body.splitlines():
        m = ITEM_RE.match(line)
        if not m:
            out_lines.append(line)
            continue
        prefix = m.group(1)
        if m.group(2) is not None:
            tag, q = m.group(2), '"'
        elif m.group(3) is not None:
            tag, q = m.group(3), "'"
        else:
            tag, q = m.group(4), ""
        new = RENAMES.get(tag, tag)
        if new in seen:
            continue
        seen.add(new)
        out_lines.append(f"{prefix}{q}{new}{q}" if q else f"{prefix}{new}")
    res = header + "\n".join(out_lines)
    if trailing_nl:
        res += "\n"
    return res


total = changed = 0
counts: dict[tuple[str, str], int] = {}
for col in COLLECTIONS:
    for md in sorted((ROOT / col).glob("*.md")):
        total += 1
        text = md.read_text()
        fm = FRONTMATTER_RE.match(text)
        if not fm:
            continue
        body = fm.group(2)
        new_body = TAGS_BLOCK_RE.sub(transform, body)
        if new_body != body:
            md.write_text(fm.group(1) + new_body + fm.group(3) + text[fm.end():])
            changed += 1
            for old, new in RENAMES.items():
                if f'"{old}"' in body or f"- {old}" in body:
                    counts[(old, new)] = counts.get((old, new), 0) + 1

print(f"Scanned {total}, modified {changed}.\n")
for (old, new), n in sorted(counts.items(), key=lambda kv: -kv[1]):
    print(f"  {n:4d}  {old!r} -> {new!r}")
