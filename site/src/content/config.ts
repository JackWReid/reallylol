import { defineCollection, z } from "astro:content";
import { cmsContentLoader } from "../lib/cms-loader";

const post = defineCollection({
  loader: cmsContentLoader("post"),
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
  loader: cmsContentLoader("note"),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

const photo = defineCollection({
  loader: cmsContentLoader("photo"),
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
  loader: cmsContentLoader("highlight"),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    slug: z.string().optional(),
    link: z.string().optional(),
    tags: z.array(z.string()).optional(),
    url: z.string().optional(),
  }),
});

const page = defineCollection({
  loader: cmsContentLoader("page"),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    layout: z.string().optional(),
    url: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { post, note, photo, highlight, page };
