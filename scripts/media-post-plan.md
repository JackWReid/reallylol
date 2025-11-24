# Plan for media conversation script

I track my media consumption with Letterboxd and Hardcover. Periodically, I use export scripts to freeze that data into JSON files for Hugo in `data/books/read.json` and so on. Examples are included below.

The problem is that really makes it a plain log with no rich information recorded about the how and the when, and so on.

I think I need a script to use the minimal data to generate a post where I can write about the media a bit.

## Spec
I invoke a `log-media.sh` script and it parses the `read.json` and `watched.json` files and presents them in a merged fzf style search. If I've already created a post about this thing, show it with a check mark in the search or something.

When I select the media item I want to log with the return key, the script parses the entry and creates a post with some rich frontmatter. If I've logged this thing before, create one with a `-[n]` suffix on the slug, and make sure you get the post date right based on the most recent time I logged it in the source data.

```
---
title: title of the book/movie (release year if movie) by Author Name if book
slug: watched-movie-YYYY or read-title-author
date: date the movie was watched or book was watched, from the json
tags: medialog, readbook if book, watchedmovie if movie
book_author: Author Name
movie_released: YYYY
media_image: google_books_cover_url or tmdb_poster_url
rating: out of 5
---

```

With that nice frontmatter ready to go, write the file to disk, then drop me into vim in it.

## Implementation
The scripts folder here is all bash, so keep it that way for this one. I will point out that you have access to a script called `cover` that's good for grabbing book data if you need to. You might not need it. Instructions on that below, if needed. If you need an API key for tmdb, let me know.

Scripts are in `scripts/` at the top of the project directory. Posts are in `content/post/YYYY-MM-DD-slug.md` where the date is the date of the post for nice alpha-sorting.

## Example Hugo data files
### List of books read
```json
[
  {
    "date_updated": "2025-11-15",
    "title": "Sad Tiger",
    "author": "Neige Sinno",
    "image_url": "https://assets.hardcover.app/edition/32022241/b13d278bacfce4e9da031e7f422d95e9ee0ef0ee.jpeg",
    "hardcover_url": "https://hardcover.app/books/sad-tiger"
  },
]
```
### List of movies watched
```json
[{"name":"Wicked Little Letters","year":"2023","date_updated":"2025-11-21"},
{"name":"Highest 2 Lowest","year":"2025","date_updated":"2025-11-14"},
{"name":"Friendship","year":"2024","date_updated":"2025-11-14"},
{"name":"Bugonia","year":"2025","date_updated":"2025-11-03"}]
```