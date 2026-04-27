import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    subtitle: z.string().optional(),
    tags: z.array(z.string()).default([]),
    book_author: z.string().optional(),
    movie_released: z.union([z.string(), z.number()]).optional(),
    media_image: z.string().optional(),
    rating: z.number().optional(),
    url: z.string().optional(),
  }),
});

const note = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/note" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

const photo = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/photo" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    image: z.string(),
    location: z.string().optional(),
    tags: z.array(z.string()).default([]),
    instagram: z.boolean().default(false),
  }),
});

const highlight = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/highlight" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    link: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, note, photo, highlight };
