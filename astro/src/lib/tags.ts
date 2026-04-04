import contentConfig from "../data/content_config.json";

export function getPrettyName(tag: string): string {
  return contentConfig.map_tag_names[tag as keyof typeof contentConfig.map_tag_names] ?? tag;
}
