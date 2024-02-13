import parse from "csv-simple-parser";

type LetterboxdList = {
  name: string;
  listId: number;
  filePath: string;
};

type Film = {
  title: string;
  year: number;
  letterboxd_guid: string;
  date: string;
};

export const letterBoxdWatchedList: LetterboxdList = {
  name: "Watched",
  listId: 1,
  filePath: "./letterboxd_export/diary.csv",
};

export const letterboxdToWatchList: LetterboxdList = {
  name: "To Watch",
  listId: 3,
  filePath: "./letterboxd_export/watchlist.csv",
};

export async function syncLetterboxdList(db, list: LetterboxdList) {
  const listFile = Bun.file(list.filePath);
  const listText = await listFile.text();
  const films = parse(listText, { header: true });

  for (const film of films) {
    if (!film["Letterboxd URI"]) {
      continue;
    }
    const filmQuery = db.query(
      "INSERT OR IGNORE INTO films (letterboxd_guid, title, year) VALUES (?, ?, ?)",
    );
    filmQuery.run(film["Letterboxd URI"], film.Name, film.Year);

    const filmIdQuery = db.query(
      "SELECT id FROM films WHERE letterboxd_guid = $letterboxd_guid",
    );
    const filmId = filmIdQuery.get({
      $letterboxd_guid: film["Letterboxd URI"],
    });

    const listQuery = db.query(
      "INSERT OR IGNORE INTO list_films (film_id, list_id, date) VALUES (?, ?, ?)",
    );
    listQuery.run(filmId.id, list.listId, film.Date);
  }
  console.log(`Synced ${list.name}`);
}

export async function syncLetterboxd(db) {
  await syncLetterboxdList(db, letterBoxdWatchedList);
  await syncLetterboxdList(db, letterboxdToWatchList);
}

export async function getFilmList(db, list: LetterboxdList) {
  const listQuery = db.query(
    "SELECT films.title, films.year, list_films.date FROM films INNER JOIN list_films ON films.id = list_films.film_id WHERE list_films.list_id = $list_id",
  );
  const films = listQuery.all({ $list_id: list.listId });
  return films;
}
