#!/usr/bin/env python3
"""Cascade parent-place tags across site/src/content/.

For every post with a tag that has known ancestors (city -> country, etc.),
ensures all ancestor tags are also present. Idempotent.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site" / "src" / "content"
COLLECTIONS = ["blog", "highlight", "photo"]

# child -> list of ancestor tags to ensure are present
ANCESTORS: dict[str, list[str]] = {
    # UK
    "london": ["uk"],
    "brixton": ["london", "uk"],
    "shoreditch": ["london", "uk"],
    "peckham": ["london", "uk"],
    "brockwell-park": ["london", "uk"],
    "oxford-circus": ["london", "uk"],
    "camden": ["london", "uk"],
    "westminster": ["london", "uk"],
    "south-bank": ["london", "uk"],
    "dulwich": ["london", "uk"],
    "greenwich": ["london", "uk"],
    "scotland": ["uk"],
    "wales": ["uk"],
    "edinburgh": ["scotland", "uk"],
    "glasgow": ["scotland", "uk"],
    "shetland": ["scotland", "uk"],
    "shropshire": ["uk"],
    "telford": ["shropshire", "uk"],
    "newport": ["shropshire", "uk"],
    "essex": ["uk"],
    "billericay": ["essex", "uk"],
    "dorset": ["uk"],
    "cornwall": ["uk"],
    "peak-district": ["uk"],
    "exeter": ["uk"],
    "cotswolds": ["uk"],
    "cambridge": ["uk"],
    "oxford": ["uk"],
    "somerset": ["uk"],
    "bath": ["somerset", "uk"],
    "sussex": ["uk"],
    "birmingham": ["uk"],
    # Germany
    "berlin": ["germany"],
    "rixdorf": ["berlin", "germany"],
    # USA
    "new-york-city": ["usa"],
    "boston": ["usa"],
    "chicago": ["usa"],
    "washington": ["usa"],
    "california": ["usa"],
    "arizona": ["usa"],
    "nevada": ["usa"],
    "san-francisco": ["california", "usa"],
    "los-angeles": ["california", "usa"],
    "las-vegas": ["nevada", "usa"],
    # France
    "paris": ["france"],
    "cannes": ["france"],
    # Italy
    "rome": ["italy"],
    # Hungary
    "budapest": ["hungary"],
    # Spain
    "barcelona": ["spain"],
    "mallorca": ["spain"],
    # Switzerland
    "basel": ["switzerland"],
    # Latvia
    "riga": ["latvia"],
    # Denmark
    "copenhagen": ["denmark"],
    # Canada
    "toronto": ["canada"],
    # India
    "bangalore": ["india"],
    "kerala": ["india"],
}

FRONTMATTER_RE = re.compile(r"^(---\n)(.*?)(\n---\n)", re.DOTALL)
TAGS_BLOCK_RE = re.compile(
    r"^(tags:[ \t]*\n)((?:[ \t]+-[ \t]+.*\n?)+)", re.MULTILINE
)
ITEM_RE = re.compile(r'^([ \t]+-[ \t]+)(?:"([^"]*)"|\'([^\']*)\'|(.+?))[ \t]*$')


def transform_block(match: re.Match[str]) -> tuple[str, list[str]]:
    header, body = match.group(1), match.group(2)
    trailing_nl = body.endswith("\n")
    items: list[tuple[str, str, str]] = []  # (prefix, quote, tag)
    other_lines: list[tuple[int, str]] = []
    for i, line in enumerate(body.splitlines()):
        m = ITEM_RE.match(line)
        if not m:
            other_lines.append((i, line))
            continue
        prefix = m.group(1)
        if m.group(2) is not None:
            tag, quote = m.group(2), '"'
        elif m.group(3) is not None:
            tag, quote = m.group(3), "'"
        else:
            tag, quote = m.group(4), ""
        items.append((prefix, quote, tag))

    existing = {t for _, _, t in items}
    to_add: list[str] = []
    for _, _, t in items:
        for anc in ANCESTORS.get(t, []):
            if anc not in existing and anc not in to_add:
                to_add.append(anc)

    if not to_add:
        return header + body, []

    if items:
        prefix, quote, _ = items[0]
    else:
        prefix, quote = "  - ", '"'

    new_items = list(items) + [(prefix, quote, t) for t in to_add]
    out_lines = [
        f"{p}{q}{t}{q}" if q else f"{p}{t}" for p, q, t in new_items
    ]
    result = header + "\n".join(out_lines)
    if trailing_nl:
        result += "\n"
    return result, to_add


def process_file(path: Path) -> list[str]:
    text = path.read_text()
    fm_match = FRONTMATTER_RE.match(text)
    if not fm_match:
        return []
    fm_open, fm_body, fm_close = fm_match.group(1), fm_match.group(2), fm_match.group(3)

    added: list[str] = []

    def sub(m: re.Match[str]) -> str:
        new, ancestors = transform_block(m)
        added.extend(ancestors)
        return new

    new_body = TAGS_BLOCK_RE.sub(sub, fm_body)
    if not added:
        return []
    path.write_text(fm_open + new_body + fm_close + text[fm_match.end():])
    return added


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        Path.write_text = lambda self, data, **kw: None  # type: ignore[assignment]

    total = changed = 0
    add_counts: dict[str, int] = {}
    for col in COLLECTIONS:
        for md in sorted((ROOT / col).glob("*.md")):
            total += 1
            added = process_file(md)
            if added:
                changed += 1
                for t in added:
                    add_counts[t] = add_counts.get(t, 0) + 1

    print(f"Scanned {total}, modified {changed}.\n")
    print("Tags added:")
    for t, n in sorted(add_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {n:5d}  +{t}")
    if dry_run:
        print("\n(dry run — no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
