import { Database } from "bun:sqlite";
import {
  okuReadList,
  okuToReadList,
  okuReadingList,
  getBookList,
  syncOku,
} from "./oku";
import {
  letterBoxdWatchedList,
  letterboxdToWatchList,
  getFilmList,
  syncLetterboxd,
} from "./letterboxd";

let db;

async function initDB() {
  db = new Database("mydb.sqlite", { create: true });

  const migrationFile = Bun.file("./migrations/001-init.sql");
  const migrationText = await migrationFile.text();
  const schemaQ = db.query(migrationText);
  schemaQ.run();
}

initDB();

syncOku(db);
syncLetterboxd(db);

Bun.serve({
  port: 8000,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response("Home page!");
    if (url.pathname === "/films/watched") {
      const list = await getFilmList(db, letterBoxdWatchedList);
      return Response.json(list);
    }
    if (url.pathname === "/films/towatch") {
      const list = await getFilmList(db, letterboxdToWatchList);
      return Response.json(list);
    }
    if (url.pathname === "/books/reading") {
      const list = await getBookList(db, okuReadingList);
      return Response.json(list);
    }
    if (url.pathname === "/books/read") {
      const list = await getBookList(db, okuReadList);
      return Response.json(list);
    }
    if (url.pathname === "/books/toread") {
      const list = await getBookList(db, okuToReadList);
      return Response.json(list);
    }

    return Response.json({ error: "Not found" });
  },
});
