#!/bin/bash

aws s3 sync s3://geniehai/gcampax/logs/ ./logs/unsorted/
for f in $(find ./logs/unsorted/ -name \*.txt) ; do
	filename=$(basename $(dirname $(dirname $f)))-$(basename $f)
	test -f ./logs/seen/$filename || cp $f ./logs/new/$filename
done
