#!/bin/bash

set -e

cat parameter-datasets2.tsv | while read type locale id filename ; do
	test -f $filename || exit 1

	echo $id
	if test $type = "entity" ; then
		thingpedia upload-entity-values --json $filename --entity-id $id --entity-name $id
	elif test $type = "string" ; then
		thingpedia upload-string-values --type-name $id --name $id $filename
	else
		echo "invalid type"
		exit 1
	fi
done
