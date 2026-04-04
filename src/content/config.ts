import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const contentRoot = resolve(dirname(fileURLToPath(import.meta.url)));

function contentBase(collection: string) {
  return resolve(contentRoot, collection);
}

const post = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/*_index.md"],
    base: contentBase("post"),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string().optional(),
    subtitle: z.string().optional(),
    tags: z.array(z.string()).default(["journal"]),
    book_author: z.string().optional(),
    movie_released: z.union([z.string(), z.number()]).optional(),
    media_image: z.string().optional(),
    rating: z.number().optional(),
    url: z.string().optional(),
  }),
});

const note = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/*_index.md"],
    base: contentBase("note"),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

const photo = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/*_index.md"],
    base: contentBase("photo"),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    image: z.string(),
    location: z.string().optional(),
    tags: z.array(z.string()).optional(),
    instagram: z.boolean().optional(),
  }),
});

const highlight = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!**/*_index.md"],
    base: contentBase("highlight"),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string().optional(),
    link: z.string().optional(),
    tags: z.array(z.string()).optional(),
    url: z.string().optional(),
  }),
});

const about = defineCollection({
  loader: glob({
    pattern: ["**/*.md"],
    base: contentBase("about"),
  }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    layout: z.string().optional(),
    url: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { post, note, photo, highlight, about };
