#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "db=prod type=online" "$@"
shift $n

set -e
set -x

if test $type = log ; then
  ${db}-mysql-run almond-cloud download-log -l en -o /proc/self/fd/1 "$@"
else
  ${db}-mysql-run almond-cloud download-dataset -l en -t ${type} -o /proc/self/fd/1 "$@"
fi
