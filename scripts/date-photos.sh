#!/bin/bash 

set -euo pipefail

mddir="./content/photo"
imgdir="./static/img/photo"

#for mdfile in $mddir/*.md; do
#	filedate=$(grep "^date: " $mdfile | cut -c 7-16)
#	mdfilebase=$(basename $mdfile)
#
#	if [[ "$mdfilebase" =~ ^$filedate.* ]];
#	then
#  	echo "[MATCH] $mdfilebase : $filedate"
#	else
#		echo "[MISS] $mdfilebase : $filedate"
#		mv $mdfile "$mddir/$filedate-$mdfilebase"
#	fi
#done

for mdfile in $mddir/2022-07-27*; do
	mdfilebase=$(basename $mdfile)
	nodatename=$(echo $mdfilebase | cut -c 12-)
	mv $mdfile $mddir/2022-07-22-$nodatename
done
