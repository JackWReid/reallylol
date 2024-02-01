CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT,
    oku_guid TEXT NOT NULL UNIQUE,
    oku_image TEXT
);

CREATE TABLE IF NOT EXISTS films (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    year INTEGER,
    letterboxd_guid TEXT NOT NULL UNIQUE,
    letterboxd_image TEXT
);

CREATE TABLE IF NOT EXISTS list (
    id INTEGER PRIMARY KEY,
    name TEXT
);

CREATE TABLE IF NOT EXISTS list_books (
    id INTEGER PRIMARY KEY,
    list_id INTEGER,
    book_id INTEGER,
    date TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS list_films (
    id INTEGER PRIMARY KEY,
    list_id INTEGER,
    film_id INTEGER,
    date TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO list (id, name) VALUES (1, 'done');
INSERT OR IGNORE INTO list (id, name) VALUES (2, 'todo');
INSERT OR IGNORE INTO list (id, name) VALUES (3, 'doing');
