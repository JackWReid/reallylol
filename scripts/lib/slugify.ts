/**
 * Canonical slugify — matches the bash/awk implementation used across the project.
 *
 * Lowercase, strip non-alphanumeric (keep spaces), spaces→dashes, collapse dashes,
 * trim leading/trailing dashes, truncate to maxLen.
 */
export function slugify(text: string, maxLen = 50): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/ +/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen);
}
