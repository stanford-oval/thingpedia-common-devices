#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "venv=./ha/homeassistant-venv config=./ha/homeassistant-config" "$@"
shift $n

set -e
set -x

source "${venv}"/bin/activate
#mkdir -p $(dirname "${config}")
#test -d "${config}" || cp -r "${srcdir}/../test/data/homeassistant" "${config}"
test -d "${config}" && cp -r ./test/data/homeassistant/* "${config}"
exec python3 -m homeassistant -c "${config}"
