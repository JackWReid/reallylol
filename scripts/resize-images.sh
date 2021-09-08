#!/bin/bash
set -euo pipefail

echo "[Photo Post] img:$1 filename:$2 title:$3 loc:$4"
date=$(date +"%Y-%m-%d")
imgpath="./static/img/photo/$2.jpg"
mdpath="./content/photo/$date.md"
absimgpath="/img/photo/$2.jpg"

# Move and transform the image file
# brew install imagemagick if mogrify is missing
cp $1 $imgpath
mogrify -quiet -format jpg -layers Dispose -resize 1000\>x1000\> -quality 80% $imgpath

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
