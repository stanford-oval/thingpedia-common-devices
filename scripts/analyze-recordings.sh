#!/bin/bash

aws s3 sync s3://geniehai/gcampax/logs/ ./logs/
( for f in $(find ./logs -name \*.txt) ; do grep -q $f ./logs/seen || echo $f ; done ) > ./logs/new
