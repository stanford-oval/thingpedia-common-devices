#!/bin/bash

set -e
set -x
prod-mysql-run almond-cloud download-dataset -l en -o /proc/self/fd/1 "$@"
