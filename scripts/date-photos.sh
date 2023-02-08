#!/bin/bash 

set -euo pipefail

mddir="./content/photo"
imgdir="./static/img/photo"

for mdfile in $mddir/*.md; do
	filedate=$(grep "^date: " $mdfile | cut -c 7-16)
	mdfilebase=$(basename $mdfile)

	if [[ "$mdfilebase" =~ ^$filedate.* ]];
	then
  	echo "[MATCH] $mdfilebase : $filedate"
	else
		echo "[MISS] $mdfilebase : $filedate"
		mv $mdfile "$mddir/$filedate-$mdfilebase"
	fi
done
