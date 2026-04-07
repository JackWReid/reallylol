import configData from "../data/config.json";

const tagNames: Record<string, string> = (configData as Record<string, unknown>).map_tag_names as Record<string, string> ?? {};

export function getPrettyName(tag: string): string {
  return tagNames[tag] ?? tag;
}

export function tagToSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, "-");
}

export function slugToTag(slug: string): string {
  return slug;
}
