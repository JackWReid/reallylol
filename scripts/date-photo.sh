#!/bin/bash 
set -euo pipefail

mddir="./content/photo"
imgdir="./static/img/photo"
imgbase=$(basename $1)
imgcode=${imgbase::${#imgbase}-4}

mdfile=$(find $mddir -name "*$imgcode*")
if [ -z "${mdfile}" ]; then
	echo [MISS] $imgbase $imgcode $mdfile
	exit 0
fi

filedate=$(grep "^date: " $mdfile | cut -c 7-16)
echo "[FOUND] $imgbase : $filedate"
sed -i '' "s|$imgcode|$filedate-$imgcode|g" $mdfile
mv $1 $imgdir/$filedate-$imgbase
