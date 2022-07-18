.mode csv
.import ./tmp/watchlist.csv Watchlist
.import ./tmp/diary.csv Diary
.mode json

.once ./tmp/towatch.json
select
  Name as name,
  Year as year,
  Date as date_updated
from Watchlist
where Date != ""
order by Date desc;

.once ./tmp/watched.json
select
  Name as name,
  Year as year,
  [Watched Date] as date_updated
from Diary
where [Watched Date] != ""
order by Date desc;

