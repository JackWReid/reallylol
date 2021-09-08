#!/bin/bash
set -euxo pipefail

#find ~/Downloads/upload -type f -iname "*.jpeg" -exec mogrify -verbose -format jpeg -layers Dispose -resize 1000\>x1000\> -quality 75% {} +
#find ~/Downloads/upload -type f -iname "*.jpg" -exec mogrify -verbose -format jpg -layers Dispose -resize 1000\>x1000\> -quality 75% {} +
#find ~/Downloads/upload -type f -iname "*.png" -exec mogrify -verbose -format png -alpha on -layers Dispose -resize 1000\>x1000\> {} +

echo "[Photo Post] img:$1 filename:$2"
imgpath="./assets/img/photo/$2"
mdpath="./content/photo/$date.md"
date=$(date +"%Y-%m-%d")
cp $1 $imgpath
mogrify -verbose -format jpeg -layers Dispose -resize 1000\>x1000\> -quality 80% $imgpath
hugo new photo/$date.md
vim $mdpath
