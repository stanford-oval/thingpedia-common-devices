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
		${THINGPEDIA_CLI} upload-device --approve \
		  --zipfile "build/$d.zip" \
		  --icon "$d/icon.png" \
		  --manifest "$d/manifest.tt" \
		  --dataset "$d/dataset.tt" \
		  --secrets "$d/secrets.json"
	else
		${THINGPEDIA_CLI} upload-device --approve \
		  --icon "$d/icon.png" \
		  --manifest "$d/manifest.tt" \
		  --dataset "$d/dataset.tt" \
		  --secrets "$d/secrets.json"
	fi
done
