#!/bin/bash
set -euo pipefail

okudl toread | jq . > ./data/books/toread.json
okudl reading | jq . > ./data/books/reading.json
okudl read | jq . > ./data/books/read.json
