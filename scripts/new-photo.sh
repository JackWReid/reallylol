#!/bin/bash
set -euo pipefail

# TODO Step by step readline to generate instead of trying
# to remember the sequence of args

echo "[PHOTO] img:$1 filename:$2 title:$3 loc:$4 date:$5"
nowdate=$(date +"%Y-%m-%d")
date="${5:-$nowdate}"
imgpath="./static/img/photo/$date-$2.jpg"
mdpath="./content/photo/$date-$2.md"
absimgpath="/img/photo/$date-$2.jpg"

# Move and transform the image file
# brew install imagemagick if mogrify is missing
cp $1 $imgpath
mogrify -quiet -format jpg -layers Dispose -resize 1400\>x1400\> -quality 100% $imgpath

# Create photo .md file for Hugo
touch $mdpath
echo "---" >> $mdpath
echo "title: \"$3\"" >> $mdpath
echo "date: $date" >> $mdpath
echo "location: $4" >> $mdpath
echo "image: \"$absimgpath\"" >> $mdpath
echo "---" >> $mdpath
echo "" >> $mdpath
echo "![]($absimgpath)" >> $mdpath
vim $mdpath
