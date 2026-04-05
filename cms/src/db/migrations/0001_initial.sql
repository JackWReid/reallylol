-- Initial CMS schema

CREATE TABLE content (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  type       TEXT NOT NULL,
  slug       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  date       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'draft',
  meta       TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_content_type_slug ON content(type, slug);
CREATE INDEX idx_content_type_date ON content(type, date DESC);
CREATE INDEX idx_content_type_status ON content(type, status);

CREATE TABLE tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE content_tags (
  content_id INTEGER NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);
CREATE INDEX idx_content_tags_tag ON content_tags(tag_id);

CREATE TABLE media (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key       TEXT NOT NULL UNIQUE,
  kind         TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes   INTEGER,
  uploaded_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_media_kind ON media(kind);

CREATE TABLE books (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  shelf         TEXT NOT NULL,
  title         TEXT NOT NULL,
  author        TEXT NOT NULL,
  date_updated  TEXT NOT NULL,
  image_url     TEXT,
  hardcover_url TEXT
);
CREATE UNIQUE INDEX idx_books_unique ON books(shelf, title, author);
CREATE INDEX idx_books_shelf ON books(shelf, date_updated DESC);

CREATE TABLE films (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  list         TEXT NOT NULL,
  name         TEXT NOT NULL,
  year         TEXT,
  date_updated TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_films_unique ON films(list, name, year);
CREATE INDEX idx_films_list ON films(list, date_updated DESC);

CREATE TABLE links (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  title   TEXT NOT NULL,
  url     TEXT NOT NULL UNIQUE,
  date    TEXT NOT NULL,
  excerpt TEXT,
  cover   TEXT,
  tags    TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_links_date ON links(date DESC);

CREATE TABLE config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
