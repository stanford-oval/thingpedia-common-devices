#!/bin/bash

set -e
set -x
set -o pipefail

THINGPEDIA_CLI=node_modules/.bin/thingpedia

for release in "$@" ; do

	if test -f "$release/manifest.tt" ; then
		kind=$(basename "$release")
		if test -f "$release/package.json" ; then
			make "build/$release.zip"
			${THINGPEDIA_CLI} upload-device --approve \
			  --zipfile "build/$release.zip" \
			  --icon "$release/icon.png" \
			  --manifest "$release/manifest.tt" \
			  --dataset "$release/dataset.tt" \
			  --secrets "$release/secrets.json"
		else
			${THINGPEDIA_CLI} upload-device --approve \
			  --icon "$release/icon.png" \
			  --manifest "$release/manifest.tt" \
			  --dataset "$release/dataset.tt" \
			  --secrets "$release/secrets.json"
		fi
	else
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
	fi
done
