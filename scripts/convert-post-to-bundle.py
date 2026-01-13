#!/usr/bin/env python3
import argparse
import datetime as dt
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POST_DIR = ROOT / "content" / "post"
ASSET_DIRS = [ROOT / "assets" / "img", ROOT / "static" / "img"]
SHORTCODE_RE = re.compile(r"{{<(?P<space>\s*)(?P<name>image|photo|figure)(?P<before>[^>]*)src=\"(?P<src>[^\"]+)\"(?P<after>[^>]*)>}}", re.IGNORECASE)
MARKDOWN_IMG_RE = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<src>[^)]+)\)")
MEDIA_MATCHERS = [
    re.compile(r"{{<\s*(?:image|photo|figure)[^>]*src=\"[^\"]+\"", re.IGNORECASE),
    re.compile(r"!\[[^\]]*\]\(/?img/", re.IGNORECASE),
]
FM_IMAGE_RE = re.compile(r"^(image\s*:\s*)\"(?P<src>/img/[^\"]+)\"", re.MULTILINE)

class PostInfo:
    def __init__(self, path: Path, title: str, date_str: str, date_sort: dt.datetime, has_media: bool):
        self.path = path
        self.title = title
        self.date_str = date_str
        self.date_sort = date_sort
        self.has_media = has_media

    @property
    def rel_path(self) -> str:
        return str(self.path.relative_to(ROOT))


def parse_front_matter(path: Path):
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None, None, ''
    if not text.startswith('---'):
        return None, None, text
    parts = text.split('---', 2)
    if len(parts) < 3:
        return None, None, text
    fm_block = parts[1]
    body = parts[2]
    title = None
    date = None
    for line in fm_block.splitlines():
        stripped = line.strip()
        if stripped.lower().startswith('title:') and title is None:
            title_val = stripped.split(':', 1)[1].strip().strip('"')
            title = title_val
        if stripped.lower().startswith('date:') and date is None:
            date = stripped.split(':', 1)[1].strip()
    return title, date, text


def parse_post_info(path: Path) -> PostInfo:
    title, date_str, text = parse_front_matter(path)
    if not title:
        title = path.stem
    date_sort = dt.datetime.min
    if date_str:
        try:
            parsed = dt.datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                parsed = dt.datetime.strptime(date_str.split()[0], "%Y-%m-%d")
            except ValueError:
                parsed = dt.datetime.min
        if isinstance(parsed, dt.datetime) and parsed.tzinfo is not None:
            parsed = parsed.astimezone(dt.timezone.utc).replace(tzinfo=None)
        date_sort = parsed
    has_media = any(regex.search(text) for regex in MEDIA_MATCHERS)
    return PostInfo(path, title, date_str or '', date_sort, has_media)


def list_flat_posts():
    posts = []
    for file in sorted(POST_DIR.glob('*.md')):
        posts.append(parse_post_info(file))
    posts.sort(key=lambda p: p.date_sort, reverse=True)
    return posts


def ensure_bundle_dir(post_path: Path) -> Path:
    bundle_dir = post_path.with_suffix('')
    if bundle_dir.exists():
        raise RuntimeError(f"Bundle directory already exists: {bundle_dir}")
    bundle_dir.mkdir(parents=True, exist_ok=False)
    return bundle_dir


def copy_media(rel_path: str, bundle_dir: Path, copied: dict) -> str:
    rel_path = rel_path.strip()
    if rel_path.startswith('http://') or rel_path.startswith('https://'):
        return rel_path
    normalized = rel_path.lstrip('/')
    if normalized.startswith('img/'):
        normalized = normalized[4:]
    if not normalized:
        return rel_path
    dest_rel = normalized
    if dest_rel in copied:
        return dest_rel
    source = None
    for base in ASSET_DIRS:
        candidate = base / normalized
        if candidate.exists():
            source = candidate
            break
    if source is None:
        print(f"[WARN] Unable to locate source for {rel_path}", file=sys.stderr)
        copied[dest_rel] = dest_rel
        return dest_rel
    dest_path = bundle_dir / normalized
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest_path)
    copied[dest_rel] = dest_rel
    return dest_rel


def replace_shortcodes(text: str, bundle_dir: Path, copied: dict) -> str:
    def repl(match):
        cleaned_src = copy_media(match.group('src'), bundle_dir, copied)
        new_tag = 'image'
        return "{{{{<{0}{1}src=\"{2}\"{3}>}}}}".format(
            match.group('space'),
            new_tag + match.group('before'),
            cleaned_src,
            match.group('after'),
        )
    return SHORTCODE_RE.sub(repl, text)


def replace_markdown_images(text: str, bundle_dir: Path, copied: dict) -> str:
    def repl(match):
        src = match.group('src')
        cleaned_src = copy_media(src, bundle_dir, copied)
        alt = match.group('alt').replace('"', '&quot;')
        return f"{{{{< image src=\"{cleaned_src}\" alt=\"{alt}\" >}}}}"
    return MARKDOWN_IMG_RE.sub(repl, text)


def replace_front_matter_image(text: str, bundle_dir: Path, copied: dict) -> str:
    def repl(match):
        cleaned_src = copy_media(match.group('src'), bundle_dir, copied)
        return f'{match.group(1)}"{cleaned_src}"'
    return FM_IMAGE_RE.sub(repl, text)


def convert_post(post_path: Path):
    post_path = post_path.resolve()
    if not post_path.exists():
        raise RuntimeError(f"Post not found: {post_path}")
    bundle_dir = ensure_bundle_dir(post_path)
    index_path = bundle_dir / 'index.md'
    shutil.move(str(post_path), str(index_path))
    text = index_path.read_text(encoding='utf-8')
    copied = {}
    text = replace_front_matter_image(text, bundle_dir, copied)
    text = replace_shortcodes(text, bundle_dir, copied)
    text = replace_markdown_images(text, bundle_dir, copied)
    index_path.write_text(text, encoding='utf-8')
    print(f"Converted to bundle: {bundle_dir.relative_to(ROOT)}")


def pick_post_interactively(posts):
    entries = [f"{p.date_str or '0000-00-00'} | {p.title} | {p.rel_path}" for p in posts]
    if not entries:
        print("No eligible posts found.")
        sys.exit(0)
    fzf = shutil.which('fzf')
    if fzf:
        proc = subprocess.run([fzf, '--prompt', 'Convert post> '], input='\n'.join(entries), text=True, capture_output=True)
        if proc.returncode != 0 or not proc.stdout.strip():
            print('No selection made.')
            sys.exit(0)
        selected = proc.stdout.strip()
    else:
        for idx, entry in enumerate(entries, 1):
            print(f"{idx}. {entry}")
        choice = input('Select a post number: ').strip()
        if not choice.isdigit():
            print('Invalid selection.')
            sys.exit(1)
        idx = int(choice) - 1
        if idx < 0 or idx >= len(posts):
            print('Selection out of range.')
            sys.exit(1)
        selected = entries[idx]
    rel_path = selected.split('|')[-1].strip()
    return ROOT / rel_path


def main():
    parser = argparse.ArgumentParser(description='Convert posts to page bundles when adding media.')
    parser.add_argument('--slug', help='Slug or filename (without .md) to convert')
    parser.add_argument('--path', help='Path to the post markdown file to convert')
    parser.add_argument('--all-media', action='store_true', help='Convert all flat posts that reference /img/ media')
    args = parser.parse_args()

    posts = list_flat_posts()

    targets = []
    if args.all_media:
        targets = [p.path for p in posts if p.has_media]
        if not targets:
            print('No media posts found to convert.')
            return
    elif args.path:
        targets = [ROOT / args.path]
    elif args.slug:
        targets = [POST_DIR / f"{args.slug}.md"]
    else:
        flat_posts = [p for p in posts]
        target_path = pick_post_interactively(flat_posts)
        targets = [target_path]

    for target in targets:
        convert_post(Path(target))


if __name__ == '__main__':
    main()
