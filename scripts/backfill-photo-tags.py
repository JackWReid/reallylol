#!/usr/bin/env python3
"""Backfill tags onto photos from their `location:` frontmatter field.

Closed-tag rule: only emit tags that already exist in the corpus. Patterns
match substrings of the location string and add the most specific known tag;
the cascade pass handles parents (e.g. brixton -> london -> uk).

Run after cascade-tags.py is in a clean state, then re-run cascade-tags.py
to expand the new base tags up to their parents.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site" / "src" / "content" / "photo"

# (substring (case-insensitive) -> tag). Order matters: most specific first.
# Matches are evaluated in order and union'd; later matches add additional tags.
PATTERNS: list[tuple[str, str]] = [
    # London neighbourhoods (specific landmarks/streets first)
    ("Brockwell Park", "brockwell-park"),
    ("Brockwell Lido", "brockwell-park"),
    ("Electric Avenue", "brixton"),
    ("Electric Lane", "brixton"),
    ("Coldharbour Lane", "brixton"),
    ("Effra Parade", "brixton"),
    ("Windrush Square", "brixton"),
    ("Railton Road", "brixton"),
    ("ブリクストン", "brixton"),
    ("Brixton", "brixton"),
    ("Old Street", "shoreditch"),
    ("Bishopsgate", "shoreditch"),
    ("Exchange House", "shoreditch"),
    ("Paul Street", "shoreditch"),
    ("Hoxton", "shoreditch"),
    ("Zetland House", "shoreditch"),
    ("Shoreditch", "shoreditch"),
    ("Peckham", "peckham"),
    ("Greenwich", "greenwich"),
    ("Camden", "camden"),
    ("Dulwich", "dulwich"),
    ("Oxford Circus", "oxford-circus"),
    ("South Bank", "south-bank"),
    ("Pall Mall", "westminster"),
    ("Trafalgar Square", "westminster"),
    ("Marble Arch", "westminster"),
    ("Mayfair", "westminster"),
    ("Whitehall", "westminster"),
    ("HM Treasury", "westminster"),
    ("Ministry of Defence", "westminster"),
    ("Millbank", "westminster"),
    ("Westminster", "westminster"),
    # London general (landmarks where no neighbourhood tag exists)
    ("Regent Street", "london"),
    ("Grosvenor Square", "london"),
    ("Barbican", "london"),
    ("Borough Market", "london"),
    ("Tate Modern", "london"),
    ("Tate Britain", "london"),
    ("Tate Gallery", "london"),
    ("Tate", "london"),
    ("William Blake Exhibition", "london"),
    ("The Courtauld", "london"),
    ("Museum of London", "london"),
    ("Tower of London", "london"),
    ("National Theatre", "london"),
    ("National Portrait Gallery", "london"),
    ("BFI", "london"),
    ("BuzzFeed UK", "london"),
    ("BuzzFeed NY", "new-york-city"),
    ("Buzzfeed", "london"),
    ("BuzzFeed", "london"),
    ("The City", "london"),
    ("Soho", "london"),
    ("Oxford Street", "london"),
    ("Kew Gardens", "london"),
    ("Royal Botanic Gardens, Kew", "london"),
    ("Palm House", "london"),
    ("Herne Hill", "london"),
    ("Hyde Park", "london"),
    ("Hampstead", "london"),
    ("Camberwell", "london"),
    ("Stockwell", "london"),
    ("Clapham", "london"),
    ("Vauxhall", "london"),
    ("Battersea", "london"),
    ("Piccadilly Circus", "london"),
    ("Green Park", "london"),
    ("Park Lane", "london"),
    ("St. Paul's Cathedral", "london"),
    ("Saint Paul's Cathedral", "london"),
    ("River Thames", "london"),
    ("Heathrow Airport", "london"),
    ("Westfield Stratford City", "london"),
    ("Putney", "london"),
    ("Primrose Hill", "london"),
    ("Canonbury", "london"),
    ("Barnard Park Islington", "london"),
    ("The Angel, Islington", "london"),
    ("Word on the Water", "london"),
    ("Regent's Canal Towpath", "london"),
    ("Regent Canalside", "london"),
    ("Museum of the Home", "london"),
    ("Dishoom Carnaby", "london"),
    ("Shakespeare's Globe", "london"),
    ("Millennium Bridge", "london"),
    ("Queen's Theatre, Shaftsbury Avenue", "london"),
    ("The Old Vic Theatre", "london"),
    ("St Thomas' Hospital", "london"),
    ("New American Embassy", "london"),
    ("Eventim Apollo", "london"),
    ("London", "london"),
    # UK regions/counties
    ("Billericay", "billericay"),
    ("Brentwood", "essex"),
    ("Newport", "newport"),  # only Newport in dataset is Shropshire's
    ("Telford", "telford"),
    ("Castle Square, Ludlow", "shropshire"),
    ("Ludlow Castle", "shropshire"),
    ("The Wrekin", "shropshire"),
    ("Fox Chetwynd Aston", "shropshire"),
    ("King's Circus, Bath", "bath"),
    ("Bath, Somerset", "bath"),
    ("Somerset", "somerset"),
    ("Weymouth", "dorset"),
    ("West Bay", "dorset"),
    ("Upwey", "dorset"),
    ("Friar Waddon", "dorset"),
    ("Coryates", "dorset"),
    ("Overcombe", "dorset"),
    ("Lulworth Cove", "dorset"),
    ("Durdle Door", "dorset"),
    ("Chesil Beach", "dorset"),
    ("Holkham", "dorset"),  # Norfolk really, but no norfolk tag
    ("Dorset", "dorset"),
    ("Crantock", "cornwall"),
    ("Porthminster Beach", "cornwall"),
    ("Cornwall", "cornwall"),
    ("Seven Sisters", "sussex"),
    ("Sussex", "sussex"),
    ("Cambridge", "cambridge"),
    ("Cotswolds", "cotswolds"),
    ("Peak District", "peak-district"),
    ("Exeter", "exeter"),
    ("Shetland", "shetland"),
    ("Resorts World Arena", "birmingham"),
    ("Star City", "birmingham"),
    ("Birmingham", "birmingham"),
    ("Arthur's Seat", "edinburgh"),
    ("The Scottish Parliament", "edinburgh"),
    ("Royal Mile", "edinburgh"),
    ("Hogmanay", "edinburgh"),
    ("Leith", "edinburgh"),
    ("Edinburgh", "edinburgh"),
    ("Glasgow", "glasgow"),
    ("Rhyl", "wales"),
    ("Conwy", "wales"),
    ("Wales", "wales"),
    ("Trossachs", "scotland"),
    ("Lochbuie", "scotland"),
    ("Ardalanish", "scotland"),
    ("Isle Of Mull", "scotland"),
    ("Essex", "essex"),
    ("Shropshire", "shropshire"),
    ("England", "uk"),
    # Germany
    ("Reichstag", "berlin"),
    ("Sony Center", "berlin"),
    ("Gemäldegalerie", "berlin"),
    ("Kulturforum", "berlin"),
    ("Rixdorf", "rixdorf"),
    ("Berlin", "berlin"),
    # USA — be careful: "New York" matches both New York City and New York state
    ("Manhattan", "new-york-city"),
    ("Brooklyn", "new-york-city"),
    ("Williamsburg", "new-york-city"),
    ("Madison Square", "new-york-city"),
    ("Union Square Park", "new-york-city"),
    ("Prospect Park", "new-york-city"),
    ("Flatiron", "new-york-city"),
    ("The High Line", "new-york-city"),
    ("Hudson River", "new-york-city"),
    ("Hudson Yards", "new-york-city"),
    ("Liberty Island", "new-york-city"),
    ("MoMA", "new-york-city"),
    ("Frying Pan - NYC", "new-york-city"),
    ("The Redbury New York", "new-york-city"),
    ("New York, New York", "new-york-city"),
    ("New York City", "new-york-city"),
    ("Jamaica Plain", "boston"),
    ("Boston", "boston"),
    ("Shedd Aquarium", "chicago"),
    ("Congress Plaza Hotel", "chicago"),
    ("Chicago", "chicago"),
    ("Santa Monica", "los-angeles"),
    ("Hollywood", "los-angeles"),
    ("Warner Brothers Studios", "los-angeles"),
    ("Los Angeles", "los-angeles"),
    ("Alcatraz Island", "san-francisco"),
    ("Presidio National Park", "san-francisco"),
    ("Bernal Heights", "san-francisco"),
    ("Telegraph Hill", "san-francisco"),
    ("Balboa Theater", "san-francisco"),
    ("Golden Gate", "san-francisco"),
    ("Reveille Coffee", "san-francisco"),
    ("Precita Park", "san-francisco"),
    ("San Francisco", "san-francisco"),
    ("McCarran International Airport", "las-vegas"),
    ("Las Vegas", "las-vegas"),
    ("Smithsonian", "washington"),
    ("Obama White House", "washington"),
    ("United States Capitol", "washington"),
    ("Arlington National Cemetery", "washington"),
    ("Washington", "washington"),
    ("Yosemite", "california"),
    ("Mt. Tipton", "arizona"),
    ("Grand Canyon", "arizona"),
    ("Guano Point", "arizona"),
    ("Arizona", "arizona"),
    ("Nevada", "nevada"),
    ("California", "california"),
    # Hungary
    ("Keleti pályaudvar", "budapest"),
    ("Dohány Street Synagogue", "budapest"),
    ("Hősök tere", "budapest"),
    ("Budapest", "budapest"),
    ("Hungary", "hungary"),
    # Italy
    ("St. Peter's Basilica, Vatican", "rome"),
    ("Vaticano", "rome"),
    ("Roma", "rome"),
    ("Rome", "rome"),
    # France
    ("Canal Saint-Martin", "paris"),
    ("Tuileries Garden", "paris"),
    ("Panthéon", "paris"),
    ("Place de la Republique", "paris"),
    ("Musée d'Orsay", "paris"),
    ("Musée Rodin", "paris"),
    ("River Seine", "paris"),
    ("Paris", "paris"),
    ("Versailles", "france"),
    ("Cannes", "cannes"),
    # Spain
    ("Barcelona", "barcelona"),
    ("Mallorca", "mallorca"),
    # Switzerland
    ("Basel", "basel"),
    # Latvia
    ("Riga", "riga"),
    # Denmark
    ("Udenrigsministeriet", "copenhagen"),
    ("Designmuseum Danmark", "copenhagen"),
    ("Rosenborg Castle", "copenhagen"),
    ("Copenhagen", "copenhagen"),
    # Canada
    ("CN Tower", "toronto"),
    ("Toronto", "toronto"),
    # Latvia
    ("Svētās Trijādības Pārdaugavas baznīca", "riga"),
    # India
    ("Fort Kochi", "kerala"),
    ("Kerala", "kerala"),
    ("Mount Sathram", "kerala"),
    ("Kumily", "kerala"),
    ("Munnar", "kerala"),
    ("Marari Beach", "kerala"),
    ("Alappuzha", "kerala"),
    ("Arthunkal", "kerala"),
    ("Domlur", "bangalore"),
    ("Taj West End, Bengaluru", "bangalore"),
    ("Bengaluru", "bangalore"),
    ("Bangalore", "bangalore"),
    # Country-suffix fallbacks (cover the long tail)
    (", United Kingdom", "uk"),
    (", United States", "usa"),
    (", Germany", "germany"),
    (", France", "france"),
    (", Italy", "italy"),
    (", Spain", "spain"),
    (", Switzerland", "switzerland"),
    (", Hungary", "hungary"),
    (", Mexico", "mexico"),
    (", India", "india"),
    (", Japan", "japan"),
    (", Russia", "russia"),
    (", China", "china"),
    (", Canada", "canada"),
    (", Denmark", "denmark"),
    (", Latvia", "latvia"),
    (", Poland", "poland"),
    (", Ireland", "ireland"),
    (", Afghanistan", "afghanistan"),
]

# Pre-compile with case-insensitive matching
COMPILED: list[tuple[re.Pattern[str], str]] = [
    (re.compile(re.escape(p), re.IGNORECASE), t) for p, t in PATTERNS
]

FRONTMATTER_RE = re.compile(r"^(---\n)(.*?)(\n---\n)", re.DOTALL)
LOCATION_RE = re.compile(r'^location:\s*"([^"]*)"', re.MULTILINE)
TAGS_BLOCK_RE = re.compile(
    r"^(tags:[ \t]*\n)((?:[ \t]+-[ \t]+.*\n?)+)", re.MULTILINE
)
HAS_TAGS_RE = re.compile(r"^tags:\s*\n\s+-", re.MULTILINE)


def derive_tags(location: str) -> list[str]:
    out: list[str] = []
    for pat, tag in COMPILED:
        if pat.search(location) and tag not in out:
            out.append(tag)
    return out


def insert_tags_block(fm_body: str, tags: list[str]) -> str:
    """Insert a new tags: block. Place it after `date:` if present, else at top."""
    block = "tags:\n" + "\n".join(f'  - "{t}"' for t in tags)
    # Try to insert after the date: line
    date_match = re.search(r'^date:\s*"[^"]*"\s*$', fm_body, re.MULTILINE)
    if date_match:
        idx = date_match.end()
        return fm_body[:idx] + "\n" + block + fm_body[idx:]
    return block + "\n" + fm_body


def process_file(path: Path) -> tuple[bool, str, list[str]]:
    text = path.read_text()
    fm_match = FRONTMATTER_RE.match(text)
    if not fm_match:
        return False, "", []
    fm_open, fm_body, fm_close = fm_match.group(1), fm_match.group(2), fm_match.group(3)

    if HAS_TAGS_RE.search(fm_body):
        return False, "", []  # already has tags
    loc_match = LOCATION_RE.search(fm_body)
    if not loc_match:
        return False, "", []
    location = loc_match.group(1)
    tags = derive_tags(location)
    if not tags:
        return False, location, []

    new_body = insert_tags_block(fm_body, tags)
    path.write_text(fm_open + new_body + fm_close + text[fm_match.end():])
    return True, location, tags


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        Path.write_text = lambda self, data, **kw: None  # type: ignore[assignment]

    total = changed = 0
    unmatched: dict[str, int] = {}
    tag_counts: dict[str, int] = {}
    for md in sorted(ROOT.glob("*.md")):
        total += 1
        ch, location, tags = process_file(md)
        if ch:
            changed += 1
            for t in tags:
                tag_counts[t] = tag_counts.get(t, 0) + 1
        elif location:
            unmatched[location] = unmatched.get(location, 0) + 1

    print(f"Scanned {total} photos, tagged {changed}.\n")
    print("Tags added:")
    for t, n in sorted(tag_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {n:5d}  +{t}")
    print(f"\nUnmatched locations (all {len(unmatched)}):")
    for loc, n in sorted(unmatched.items(), key=lambda kv: -kv[1]):
        print(f"  {n:5d}  {loc}")
    print(f"\nUnmatched total: {sum(unmatched.values())} photos")
    if dry_run:
        print("\n(dry run — no files written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
