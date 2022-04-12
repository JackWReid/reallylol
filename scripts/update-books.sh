#!/bin/bash
set -euo pipefail

echo "Updating books pages from Goodreads export"
echo "https://www.goodreads.com/review/import for latest CSV"
mkdir ./tmp
cp $1 ./tmp/raw.csv

/usr/local/opt/sqlite/bin/sqlite3 < ./scripts/update-books.sql

mv ./tmp/toread.json ./data/books/toread.json
mv ./tmp/reading.json ./data/books/reading.json
mv ./tmp/read.json ./data/books/read.json
rm -r ./tmp
