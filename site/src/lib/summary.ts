/**
 * Generate a plain-text summary from raw markdown body.
 * Mirrors Hugo's .Summary behaviour:
 *   - Uses content before <!--more--> if present
 *   - Otherwise takes the first ~70 words of paragraph text
 *   - Strips shortcodes, images, code blocks, headers, and blockquotes
 */
export function generateSummary(body: string, wordLimit = 70): string {
  // Honour <!--more--> manual break
  const moreIdx = body.indexOf("<!--more-->");
  const text = moreIdx > -1 ? body.slice(0, moreIdx) : body;

  const stripped = text
    .replace(/{{<[\s\S]*?>}}/g, "")          // Hugo shortcodes
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")    // markdown images
    .replace(/```[\s\S]*?```/g, "")          // fenced code blocks
    .replace(/`[^`]+`/g, "")                 // inline code
    .replace(/^#{1,6}\s.*/gm, "")            // headings
    .replace(/^>\s?.*/gm, "")               // blockquotes
    .replace(/^[-*_]{3,}\s*$/gm, "")         // horizontal rules
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1") // bold/italic
    .trim();

  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length <= wordLimit) return stripped;
  return words.slice(0, wordLimit).join(" ") + "…";
}
