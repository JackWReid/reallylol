import { getCollection } from "astro:content";
import { generateSummary } from "./summary";

export interface FeedItem {
  type: "blog" | "note" | "photo" | "highlight";
  id: string;
  title: string;
  date: Date;
  excerpt?: string;
  image?: string;
  location?: string;
}

function stripExt(id: string): string {
  return id.replace(/\.md$/, "");
}

function typeLabel(type: string): string {
  if (type === "blog") return "journal";
  return type;
}

function typeUrl(item: FeedItem): string {
  if (item.type === "blog") return `/post/${item.id}/`;
  if (item.type === "note") return `/note/${item.id}/`;
  if (item.type === "photo") return `/photo/${item.id}/`;
  if (item.type === "highlight") return `/highlight/${item.id}/`;
  return "/";
}

export { typeLabel, typeUrl };

export async function getAllFeedItems(): Promise<FeedItem[]> {
  const [posts, notes, photos, highlights] = await Promise.all([
    getCollection("blog"),
    getCollection("note"),
    getCollection("photo"),
    getCollection("highlight"),
  ]);

  const items: FeedItem[] = [
    ...posts.map((p) => ({
      type: "blog" as const,
      id: stripExt(p.id),
      title: p.data.title,
      date: p.data.date,
      excerpt: generateSummary(p.body ?? ""),
    })),
    ...notes.map((n) => ({
      type: "note" as const,
      id: stripExt(n.id),
      title: n.data.title,
      date: n.data.date,
    })),
    ...photos.map((p) => ({
      type: "photo" as const,
      id: stripExt(p.id),
      title: p.data.title,
      date: p.data.date,
      image: p.data.image,
      location: p.data.location,
    })),
    ...highlights.map((h) => ({
      type: "highlight" as const,
      id: stripExt(h.id),
      title: h.data.title,
      date: h.data.date,
    })),
  ];

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
