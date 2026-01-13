#!/usr/bin/env python3
import re
import html
from pathlib import Path

PHOTO_DIR = Path('content/photo')
image_line_re = re.compile(r'^(?P<indent>\s*)image:\s*(?P<quote>["\'])?/img/photo/(?P<path>[^"\'\s]+)(?P=quote)?\s*$')
md_image_re = re.compile(r'!\[(?P<alt>[^\]]*)\]\(/img/photo/(?P<path>[^)]+)\)')

updated = 0
skipped = []

for md_file in sorted(PHOTO_DIR.glob('*.md')):
    text = md_file.read_text()
    lines = text.splitlines()
    if not lines or lines[0].strip() != '---':
        skipped.append(md_file)
        continue
    # locate end front matter
    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            end_idx = i
            break
    if end_idx is None:
        skipped.append(md_file)
        continue
    front_lines = lines[1:end_idx]
    body_lines = lines[end_idx+1:]

    fm_changed = False
    for idx, line in enumerate(front_lines):
        m = image_line_re.match(line)
        if m:
            new_line = f"{m.group('indent')}image: \"img/photo/{m.group('path')}\""
            if new_line != line:
                front_lines[idx] = new_line
                fm_changed = True
            break

    body_text = '\n'.join(body_lines)
    def repl(match):
        alt = html.escape(match.group('alt'), quote=True)
        path = match.group('path')
        return f"{{{{< image src=\"img/photo/{path}\" alt=\"{alt}\" >}}}}"
    new_body_text, body_replacements = md_image_re.subn(repl, body_text)

    if not fm_changed and body_replacements == 0:
        continue

    new_lines = ['---'] + front_lines + ['---']
    if new_body_text:
        new_lines.append('')
        new_lines.extend(new_body_text.split('\n'))
    else:
        new_lines.append('')
    new_text = '\n'.join(new_lines).rstrip() + '\n'
    md_file.write_text(new_text)
    updated += 1

print(f"Updated {updated} photo files")
if skipped:
    print(f"Skipped {len(skipped)} files without recognizable front matter")
