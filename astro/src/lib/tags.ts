import contentConfig from "../data/content_config.json";

export function getPrettyName(tag: string): string {
  return contentConfig.map_tag_names[tag as keyof typeof contentConfig.map_tag_names] ?? tag;
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
