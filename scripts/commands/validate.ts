/** Frontmatter validation command — reads file paths from stdin. */

import { readFileSync, existsSync } from "fs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function validateFile(path: string): string[] {
  const issues: string[] = [];

  if (!existsSync(path)) {
    return [`File not found: ${path}`];
  }

  const text = readFileSync(path, "utf-8");

  if (!text.startsWith("---")) {
    issues.push("Missing frontmatter (no opening ---)");
    return issues;
  }

  const parts = text.split("---", 3);
  if (parts.length < 3) {
    issues.push("Malformed frontmatter (no closing ---)");
    return issues;
  }

  const fm = parts[1];

  // Check title
  const titleMatch = fm.match(/^title:\s*(.+)/m);
  if (!titleMatch) {
    issues.push("Missing 'title' field");
  } else if (!titleMatch[1].trim().replace(/^['"]|['"]$/g, "")) {
    issues.push("Empty 'title' field");
  }

  // Check date
  const dateMatch = fm.match(/^date:\s*(.+)/m);
  if (!dateMatch) {
    issues.push("Missing 'date' field");
  } else if (!DATE_RE.test(dateMatch[1].trim().replace(/^['"]|['"]$/g, ""))) {
    issues.push(`Unparseable 'date': ${dateMatch[1].trim()}`);
  }

  // Photo-specific: check for image field
  if (path.includes("/photo/") && !path.includes("_index")) {
    const imageMatch = fm.match(/^image:\s*(.+)/m);
    if (!imageMatch) {
      issues.push("Photo missing 'image' field");
    }
  }

  return issues;
}

export async function validate(_args: string[]): Promise<void> {
  // Read file paths from stdin
  const input = await Bun.stdin.text();
  const paths = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (paths.length === 0) return;

  let errors = 0;
  for (const filePath of paths) {
    const issues = validateFile(filePath);
    if (issues.length > 0) {
      errors++;
      console.log(`  ${filePath}:`);
      for (const issue of issues) {
        console.log(`    - ${issue}`);
      }
    }
  }

  if (errors > 0) {
    console.log(`\n  ${errors} file(s) with frontmatter issues`);
    process.exit(1);
  }
}
