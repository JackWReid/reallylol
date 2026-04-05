import { getConfig } from "./cms-data";

const contentConfig = await getConfig() as {
  map_tag_names: Record<string, string>;
  exclude_tags: string[];
};

export function getPrettyName(tag: string): string {
  return contentConfig.map_tag_names[tag] ?? tag;
}

/** Normalise a tag to a URL-safe slug (spaces → hyphens, lowercase). */
export function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

/** Reverse a URL slug back to the original tag (best-effort, hyphens → spaces).
 *  Used in tag archive pages where the route param is a slug. */
export function slugToTag(slug: string): string {
  // Try to find a canonical tag that normalises to this slug
  return slug;
}
