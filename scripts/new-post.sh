#!/bin/bash
set -euo pipefail

echo "[POST] slug:$1 title:$2"
date=$(date +"%Y-%m-%d")
mdpath="./content/post/$date-$1.md"

# Create post .md file for Hugo
touch $mdpath
echo "---" >> $mdpath
echo "title: \"$2\"" >> $mdpath
echo "date: $date" >> $mdpath
echo "tags:" >> $mdpath
echo " - journal" >> $mdpath
echo "---" >> $mdpath
echo "" >> $mdpath
vim $mdpath
