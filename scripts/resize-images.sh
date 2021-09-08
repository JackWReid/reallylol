#!/bin/bash
set -euxo pipefail

#find ~/Downloads/upload -type f -iname "*.jpeg" -exec mogrify -verbose -format jpeg -layers Dispose -resize 1000\>x1000\> -quality 75% {} +
#find ~/Downloads/upload -type f -iname "*.jpg" -exec mogrify -verbose -format jpg -layers Dispose -resize 1000\>x1000\> -quality 75% {} +
#find ~/Downloads/upload -type f -iname "*.png" -exec mogrify -verbose -format png -alpha on -layers Dispose -resize 1000\>x1000\> {} +

echo "[Photo Post] img:$1 filename:$2"
date=$(date +"%Y-%m-%d")
imgpath="./static/img/photo/$2.jpg"
mdpath="./content/photo/$date.md"
absimgpath="/img/photo/$2.jpg"
cp $1 $imgpath
mogrify -verbose -format jpg -layers Dispose -resize 1000\>x1000\> -quality 80% $imgpath
hugo new photo/$date.md
echo $absimgpath >> $mdpath
vim $mdpath
