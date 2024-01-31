const RSSParser = require("rss-parser");
const parser = new RSSParser();

type OkuFeed = {
  name: string;
  feedUrl: string;
  listId: number;
};

type Book = {
  oku_guid: string;
  oku_image: string;
  title: string;
  author: string;
  date: string;
};

const oku_read_feed: OkuFeed = {
  name: "Read",
  feedUrl: "https://oku.club/rss/collection/zQtTo",
  listId: 1,
};
const oku_toread_feed: OkuFeed = {
  name: "To Read",
  feedUrl: "https://oku.club/rss/collection/JSKHS",
  listId: 2,
};
const oku_reading_feed: OkuFeed = {
  name: "Reading",
  feedUrl: "https://oku.club/rss/collection/2f67M",
  listId: 3,
};

async function insertBooks(db, books: Book[]) {
  const insertQuery = db.query(
    "INSERT OR IGNORE INTO books (oku_guid, oku_image, title, author) VALUES (?, ?, ?, ?)",
  );

  for (const book of books) {
    insertQuery.run(book.oku_guid, book.oku_image, book.title, book.author);
  }
}

async function insertBookListEntries(db, books: Book[], feed: OkuFeed) {
  for (const book of books) {
    const bookIdQuery = db.query(
      "SELECT id FROM books WHERE oku_guid = $oku_guid",
    );
    const bookId = bookIdQuery.get({ $oku_guid: book.oku_guid });

    const insertQuery = db.query(
      "INSERT OR IGNORE INTO list_books (book_id, list_id, date) VALUES (?, ?, ?)",
    );

    insertQuery.run(bookId.id, feed.listId, book.date);
  }
}

async function pullOkuFeed(feed: OkuFeed, db) {
  const feedData = await parser.parseURL(feed.feedUrl);

  const books = feedData.items.map((item: any) => ({
    oku_guid: item.guid,
    oku_image: item.enclosure?.url,
    date: item.isoDate,
    title: item.title,
    author: item.creator,
  }));

  await insertBooks(db, books);
  await insertBookListEntries(db, books, feed);
  console.log(`Pulled ${feed.name}`);
}

export async function pullOku(db) {
  await pullOkuFeed(oku_read_feed, db);
  await pullOkuFeed(oku_toread_feed, db);
  await pullOkuFeed(oku_reading_feed, db);
}
