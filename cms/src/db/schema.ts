import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const content = sqliteTable(
  "content",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    type: text("type").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    date: text("date").notNull(),
    status: text("status").notNull().default("draft"),
    meta: text("meta").notNull().default("{}"),
    created_at: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updated_at: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("idx_content_type_slug").on(table.type, table.slug),
    index("idx_content_type_date").on(table.type, table.date),
    index("idx_content_type_status").on(table.type, table.status),
  ],
);

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const contentTags = sqliteTable(
  "content_tags",
  {
    content_id: integer("content_id")
      .notNull()
      .references(() => content.id, { onDelete: "cascade" }),
    tag_id: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.content_id, table.tag_id] }),
    index("idx_content_tags_tag").on(table.tag_id),
  ],
);

export const media = sqliteTable(
  "media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    r2_key: text("r2_key").notNull().unique(),
    kind: text("kind").notNull(),
    content_type: text("content_type").notNull(),
    size_bytes: integer("size_bytes"),
    uploaded_at: text("uploaded_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_media_kind").on(table.kind)],
);

export const books = sqliteTable(
  "books",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shelf: text("shelf").notNull(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    date_updated: text("date_updated").notNull(),
    image_url: text("image_url"),
    hardcover_url: text("hardcover_url"),
  },
  (table) => [
    uniqueIndex("idx_books_unique").on(table.shelf, table.title, table.author),
    index("idx_books_shelf").on(table.shelf, table.date_updated),
  ],
);

export const films = sqliteTable(
  "films",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    list: text("list").notNull(),
    name: text("name").notNull(),
    year: text("year"),
    date_updated: text("date_updated").notNull(),
  },
  (table) => [
    uniqueIndex("idx_films_unique").on(table.list, table.name, table.year),
    index("idx_films_list").on(table.list, table.date_updated),
  ],
);

export const links = sqliteTable(
  "links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    url: text("url").notNull().unique(),
    date: text("date").notNull(),
    excerpt: text("excerpt"),
    cover: text("cover"),
    tags: text("tags").notNull().default("[]"),
  },
  (table) => [index("idx_links_date").on(table.date)],
);

export const config = sqliteTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
