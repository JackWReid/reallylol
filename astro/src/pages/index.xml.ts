import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await getCollection("post");
  const notes = await getCollection("note");
  const highlights = await getCollection("highlight");
  const photos = await getCollection("photo");

  const allItems = [
    ...posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/post/${p.id}/`,
    })),
    ...notes.map((n) => ({
      title: n.data.title,
      pubDate: n.data.date,
      link: `/note/${n.id}/`,
    })),
    ...highlights.map((h) => ({
      title: h.data.title,
      pubDate: h.data.date,
      link: `/highlight/${h.id}/`,
    })),
    ...photos.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/photo/${p.id}/`,
      description: "This post is a photo. Visit really.lol to view it.",
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "really.lol",
    description: "Jack Reid's blog",
    site: context.site!.toString(),
    items: allItems,
  });
}
