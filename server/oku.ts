const RSSParser = require("rss-parser");
const parser = new RSSParser();

type OkuList = {
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

export const okuReadList: OkuList = {
  name: "Read",
  feedUrl: "https://oku.club/rss/collection/zQtTo",
  listId: 1,
};

export const okuToReadList: OkuList = {
  name: "To Read",
  feedUrl: "https://oku.club/rss/collection/JSKHS",
  listId: 2,
};

export const okuReadingList: OkuList = {
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

async function insertBookListEntries(db, books: Book[], feed: OkuList) {
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

async function syncOkuList(feed: OkuList, db) {
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
  console.log(`Synced ${feed.name}`);
}

export async function syncOku(db) {
  await syncOkuList(okuReadList, db);
  await syncOkuList(okuToReadList, db);
  await syncOkuList(okuReadingList, db);
}

export async function getBookList(db, list: OkuList) {
  const listQuery = db.query(
    "SELECT books.title, books.author, list_books.date FROM list_books JOIN books ON list_books.book_id = books.id WHERE list_books.list_id = $listId",
  );

  const books = listQuery.all({ $listId: list.listId });
  return books;
}
