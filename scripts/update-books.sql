.mode csv
.import ./tmp/raw.csv Books
.mode json

.once ./tmp/reading.json
select
  [Book Id] as id,
  Title as title,
  Author as author,
  replace([Date Added], "/", "-") as date_updated
from Books
where
  "Exclusive Shelf" = "currently-reading"
  and [Date Added] != ""
order by [Date Added] desc;

.once ./tmp/read.json
select
  [Book Id] as id,
  Title as title,
  Author as author,
  replace([Date Read], "/", "-") as date_updated
from Books
where
  "Exclusive Shelf" = "read"
  and [Date Read] != ""
order by [Date Read] desc;

.once ./tmp/toread.json
select
  [Book Id] as id,
  Title as title,
  Author as author,
  replace([Date Added], "/", "-") as date_updated
from Books
where
  "Exclusive Shelf" = "to-read"
  and [Date Added] != ""
order by [Date Added] desc;
