#!/bin/bash
set -euo pipefail

cd ~

cab list -json -type=movie -status=todo > ~/jackreid.xyz/data/films/towatch.json
cab list -json -type=movie -status=done > ~/jackreid.xyz/data/films/watched.json

cab list -json -type=book -status=todo > ~/jackreid.xyz/data/books/tobook.json
cab list -json -type=book -status=doing > ~/jackreid.xyz/data/books/reading.json
cab list -json -type=book -status=done > ~/jackreid.xyz/data/books/read.json