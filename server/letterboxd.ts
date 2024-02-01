import parse from "csv-simple-parser";

type LetterboxdList = {
  name: string;
  listId: number;
};

type Film = {
  title: string;
  year: number;
  letterboxd_guid: string;
  date: string;
};

const letterboxd_watched_list: LetterboxdList = {
  name: "Watched",
  listId: 1,
};

const letterboxd_towatch_list: LetterboxdList = {
  name: "To Watched",
  listId: 3,
};

export async function pullLetterboxdList(
  db,
  list: LetterboxdList,
  file: string,
) {
  const films = parse(file, { header: true });

  for (const film of films) {
    const filmQuery = db.query(
      "INSERT OR IGNORE INTO films (letterboxd_guid, title, year) VALUES (?, ?, ?) RETURNING id",
    );
    const result = filmQuery.get(film["Letterboxd URI"], film.Name, film.Year);
    console.log(result);
    const listQuery = db.query(
      "INSERT OR IGNORE INTO list_films (film_id, list_id, date) VALUES (?, ?, ?)",
    );
    listQuery.run(result.id, list.listId, film.Date);
  }
}

export async function pullLetterboxd(db) {
  const watchlistFile = Bun.file("./letterboxd_export/watchlist.csv");
  const diaryFile = Bun.file("./letterboxd_export/diary.csv");
  const watchlistText = await watchlistFile.text();
  const diaryText = await diaryFile.text();
  await pullLetterboxdList(db, letterboxd_watched_list, diaryText);
}
