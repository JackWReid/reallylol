#!/bin/bash
set -euxo pipefail

echo "[Photo Post] img:$1 filename:$2 title:$3 loc:$4"
date=$(date +"%Y-%m-%d")
imgpath="./static/img/photo/$2.jpg"
mdpath="./content/photo/$date.md"
absimgpath="/img/photo/$2.jpg"

# Move and transform the image file
cp $1 $imgpath
mogrify -verbose -format jpg -layers Dispose -resize 1000\>x1000\> -quality 80% $imgpath

# Create photo .md file for Hugo
hugo new photo/$date.md
touch $mdpath
echo "---" >> $mdpath
echo "title: \"$3\"" >> $mdpath
echo "date: $date" >> $mdpath
echo "location: $4" >> $mdpath
echo "image: \"$absimgpath\"" >> $mdpath
echo "---\n" >> $mdpath
echo "![]($absimgpath)\n" >> $mdpath
vim $mdpath
