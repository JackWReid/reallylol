import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";

const MEDIA_BASE = "https://media.really.lol";

export async function GET(context: APIContext) {
  const posts = await getCollection("post");
  const notes = await getCollection("note");
  const photos = await getCollection("photo");

  const items = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/writing/${p.id}/`,
      content: p.rendered?.html ?? p.body ?? "",
    })),
    ...notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      link: `/notes/${n.id}/`,
      content: n.rendered?.html ?? n.body ?? "",
    })),
    ...photos.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/photo/${p.id}/`,
      content: `<img src="${MEDIA_BASE}/${p.data.image}" alt="${p.data.title}"${p.data.location ? ` title="${p.data.location}"` : ""} />`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "really.lol",
    description: "Writing, photos, notes, and things read and watched.",
    site: context.site!,
    items,
  });
}
