#!/bin/bash
set -euo pipefail

okudl toread > ./data/books/toread.json
okudl reading > ./data/books/reading.json
okudl read > ./data/books/read.json
