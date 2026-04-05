import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";

export async function GET(context: APIContext) {
  const posts = await getCollection("post");
  const notes = await getCollection("note");
  const photos = await getCollection("photo");

  const items = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/writing/${p.id}/`,
      description: p.body?.slice(0, 200) ?? "",
    })),
    ...notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      link: `/notes/${n.id}/`,
    })),
    ...photos.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/photo/${p.id}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "really.lol",
    description: "Writing, photos, notes, and things read and watched.",
    site: context.site!,
    items,
  });
}
