#!/bin/bash
find ~/Downloads/upload -type f -iname "*.jpeg" -exec mogrify -verbose -format jpeg -layers Dispose -resize 1000\>x1000\> -quality 75% {} +
find ~/Downloads/upload -type f -iname "*.jpg" -exec mogrify -verbose -format jpg -layers Dispose -resize 1000\>x1000\> -quality 75% {} +
find ~/Downloads/upload -type f -iname "*.png" -exec mogrify -verbose -format png -alpha on -layers Dispose -resize 1000\>x1000\> {} +
