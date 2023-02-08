#!/bin/bash 

set -euo pipefail

mddir="./content/photo"
imgdir="./static/img/photo"

for mdfile in $mddir/*.md; do
	filedate=$(grep "^date: " $mdfile | cut -c 7-16)
	imgfilefrommd=$(grep "^image: " $mdfile | cut -d'"' -f 2)
	mdfilebase=$(basename $mdfile)
	
	imgbase=$(basename $imgfilefrommd)	
	newimgbase=$filedate-$imgbase
	before=${imgbase::${#imgbase}-4}
	after=${newimgbase::${#newimgbase}-4}
	sed -i "s|$before|$after|g" $mdfile
	mv "./static/$imgbase" "./static/img/photo/$newimgbase"

#	if [[ "$mdfilebase" =~ ^$filedate.* ]];
#	then
#  	echo "[MATCH] $mdfilebase : $filedate"
#	else
#		echo "[MISS] $mdfilebase : $filedate"
#		mv $mdfile "$mddir/$filedate-$mdfilebase"
#	fi

	# TODO Correct image file names based on .md file names
	# Cut guide
	# 12-12-12-
	# 123456789
	#
	
		
done
