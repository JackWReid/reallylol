/** Frontmatter generation and parsing. */

export interface FrontmatterFields {
  [key: string]: string | string[] | number | boolean | undefined;
}

/**
 * Generate YAML frontmatter string from a fields object.
 * Arrays are rendered as YAML lists. Undefined values are omitted.
 */
export function generateFrontmatter(fields: FrontmatterFields): string {
  const lines: string[] = ["---"];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - ${item}`);
      }
    } else if (typeof value === "string") {
      // Quote strings that contain spaces, special YAML chars, or could be
      // misinterpreted. Simple values like dates/slugs stay unquoted.
      if (needsQuoting(value)) {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function needsQuoting(s: string): boolean {
  // Quote strings containing spaces, colons, special YAML chars, or that could
  // be misinterpreted. Simple slugs, dates, URLs stay unquoted only if safe.
  return /[ :#{}\[\],&*?|>!%@`"']/.test(s) || s.trim() !== s;
}

export interface ParsedFrontmatter {
  fields: Record<string, string>;
  body: string;
  raw: string;
}

/**
 * Parse frontmatter from a markdown file's text content.
 * Returns the raw fields as string key-value pairs plus the body.
 */
export function parseFrontmatter(text: string): ParsedFrontmatter | null {
  if (!text.startsWith("---")) return null;
  const parts = text.split("---", 3);
  if (parts.length < 3) return null;

  const fm = parts[1];
  const body = parts.slice(2).join("---");
  const fields: Record<string, string> = {};

  for (const line of fm.split("\n")) {
    const match = line.match(/^(\w[\w_]*)\s*:\s*(.+)/);
    if (match) {
      fields[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  return { fields, body, raw: fm };
}

/**
 * Extract tags from YAML frontmatter text (handles both inline and list formats).
 */
export function parseTags(fmText: string): string[] {
  // Inline: tags: [tag1, tag2]
  const inline = fmText.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inline) {
    return inline[1]
      .split(",")
      .map((t) => t.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  // List: tags:\n  - tag1\n  - tag2
  const list = fmText.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (list) {
    return list[1]
      .split("\n")
      .filter((l) => l.trim().startsWith("-"))
      .map((l) =>
        l
          .trim()
          .replace(/^-\s*/, "")
          .trim()
          .replace(/^['"]|['"]$/g, ""),
      );
  }

  return [];
}
