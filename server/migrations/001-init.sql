CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    title TEXT,
    author TEXT
);

CREATE TABLE IF NOT EXISTS list (
    id INTEGER PRIMARY KEY,
    name TEXT
);

CREATE TABLE IF NOT EXISTS list_books (
    id INTEGER PRIMARY KEY,
    list_id INTEGER,
    book_id INTEGER
    date_added TEXT,
);
