import { getConfig } from "./cms-data";

let contentConfig: {
  map_tag_names: Record<string, string>;
  exclude_tags: string[];
} | null = null;

async function loadConfig() {
  if (contentConfig) return contentConfig;
  try {
    contentConfig = await getConfig() as typeof contentConfig;
  } catch {
    contentConfig = { map_tag_names: {}, exclude_tags: [] };
  }
  return contentConfig!;
}

// Eagerly load at build time for static pages
loadConfig();

export function getPrettyName(tag: string): string {
  return contentConfig?.map_tag_names[tag] ?? tag;
}

/** Normalise a tag to a URL-safe slug (spaces → hyphens, lowercase). */
export function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

/** Reverse a URL slug back to the original tag (best-effort, hyphens → spaces).
 *  Used in tag archive pages where the route param is a slug. */
export function slugToTag(slug: string): string {
  return slug;
}
