#!/bin/bash

set -e
set -x
set -o pipefail

THINGPEDIA_CLI=node_modules/.bin/thingpedia

release="$1"

for d in "$release/"* ; do
	test -f "$d/manifest.tt" || continue

	kind=$(basename "$d")
	if test -f "$d/package.json" ; then
		make "build/$d.zip"
		${THINGPEDIA_CLI} upload-device --zipfile "build/$d.zip" --icon "$d/icon.png" --manifest "$d/manifest.tt" --dataset "$d/dataset.tt" --approve
	else
		${THINGPEDIA_CLI} upload-device --icon "$d/icon.png" --manifest "$d/manifest.tt" --dataset "$d/dataset.tt" --approve
	fi
done
