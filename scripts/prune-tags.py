#!/usr/bin/env python3
"""Long-tail tag prune for site/src/content/.

Folds singleton/redundant tags into their canonical parents, removes one typo,
and renames named-people tags to a `person-<name>` namespace.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site" / "src" / "content"
COLLECTIONS = ["blog", "highlight", "photo"]

# tag -> replacement tag (or None to remove)
RENAMES: dict[str, str | None] = {
    # synonyms
    "america": "usa",
    "technology": "tech",
    "coding": "code",
    # tech umbrella
    "computers": "tech",
    "engineering": "tech",
    "hacks": "tech",
    "unix": "tech",
    # gender umbrella
    "feminism": "gender",
    "trans": "gender",
    "women": "gender",
    # cities/urbanism
    "urban": "cities",
    "urbanism": "cities",
    "skyline": "architecture",
    # photo subjects
    "portrait": "faces",
    "pigs": "animals",
    "pond": "water",
    "river": "water",
    "marine": "sea",
    "rocks": "landscape",
    "sculpture": "art",
    "lettering": "typography",
    # activities
    "sports": "fitness",
    "camping": "outdoors",
    # other
    "theory": "philosophy",
    "facebook": "social-media",
    # named people -> person-<name>
    "sarah": "person-sarah",
    "lizzie": "person-lizzie",
    "emma": "person-emma",
    "jack": "person-jack",
    "matt": "person-matt",
    "tom": "person-tom",
    "henry": "person-henry",
    "martha": "person-martha",
    "lukas": "person-lukas",
    # outright removals
    "tag": None,
}

FRONTMATTER_RE = re.compile(r"^(---\n)(.*?)(\n---\n)", re.DOTALL)
TAGS_BLOCK_RE = re.compile(
    r"^(tags:[ \t]*\n)((?:[ \t]+-[ \t]+.*\n?)+)", re.MULTILINE
)
TAGS_INLINE_RE = re.compile(r"^tags:[ \t]*\[([^\]]*)\][ \t]*$", re.MULTILINE)
ITEM_RE = re.compile(r'^([ \t]+-[ \t]+)(?:"([^"]*)"|\'([^\']*)\'|(.+?))[ \t]*$')


def normalise(tag: str) -> list[str]:
    if tag not in RENAMES:
        return [tag]
    repl = RENAMES[tag]
    return [] if repl is None else [repl]


def transform_block(match: re.Match[str]) -> str:
    header, body = match.group(1), match.group(2)
    trailing_nl = body.endswith("\n")
    out_lines: list[str] = []
    seen: set[str] = set()
    indent_quote: tuple[str, str] | None = None
    for line in body.splitlines():
        m = ITEM_RE.match(line)
        if not m:
            out_lines.append(line)
            continue
        prefix = m.group(1)
        if m.group(2) is not None:
            tag, quote = m.group(2), '"'
        elif m.group(3) is not None:
            tag, quote = m.group(3), "'"
        else:
            tag, quote = m.group(4), ""
        if indent_quote is None:
            indent_quote = (prefix, quote)
        for new_tag in normalise(tag):
            if new_tag in seen:
                continue
            seen.add(new_tag)
            ip, q = indent_quote
            out_lines.append(f"{ip}{q}{new_tag}{q}" if q else f"{ip}{new_tag}")
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
        for new_tag in normalise(tag):
            if new_tag in seen:
                continue
            seen.add(new_tag)
            new_parts.append(f'"{new_tag}"')
    return f"tags: [{', '.join(new_parts)}]"


def process_file(path: Path) -> tuple[bool, list[tuple[str, str | None]]]:
    text = path.read_text()
    fm_match = FRONTMATTER_RE.match(text)
    if not fm_match:
        return False, []
    fm_open, fm_body, fm_close = fm_match.group(1), fm_match.group(2), fm_match.group(3)
    new_body = TAGS_BLOCK_RE.sub(transform_block, fm_body)
    new_body = TAGS_INLINE_RE.sub(transform_inline, new_body)
    if new_body == fm_body:
        return False, []
    path.write_text(fm_open + new_body + fm_close + text[fm_match.end():])

    def extract(b: str) -> list[str]:
        out: list[str] = []
        if (block := TAGS_BLOCK_RE.search(b)):
            for line in block.group(2).splitlines():
                m = ITEM_RE.match(line)
                if m:
                    out.append(m.group(2) or m.group(3) or m.group(4))
        if (inline := TAGS_INLINE_RE.search(b)):
            out.extend(
                p.strip().strip('"').strip("'")
                for p in inline.group(1).split(",")
                if p.strip()
            )
        return out

    before = extract(fm_body)
    changes: list[tuple[str, str | None]] = []
    for tag in before:
        if tag in RENAMES:
            changes.append((tag, RENAMES[tag]))
    return True, changes


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        Path.write_text = lambda self, data, **kw: None  # type: ignore[assignment]

    total = changed = 0
    counts: dict[tuple[str, str | None], int] = {}
    for col in COLLECTIONS:
        for md in sorted((ROOT / col).glob("*.md")):
            total += 1
            ch, changes = process_file(md)
            if ch:
                changed += 1
                for c in changes:
                    counts[c] = counts.get(c, 0) + 1

    print(f"Scanned {total}, modified {changed}.\n")
    for (old, new), n in sorted(counts.items(), key=lambda kv: -kv[1]):
        repl = "(removed)" if new is None else f"-> {new!r}"
        print(f"  {n:4d}  {old!r:30s} {repl}")
    if dry_run:
        print("\n(dry run — no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
