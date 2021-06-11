#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "venv=./tmp/homeassistant-venv config=./tmp/homeassistant-config" "$@"
shift $n

set -e
set -x

mkdir -p $(dirname "${venv}")
test -d "${venv}" || virtualenv "${venv}"
. "${venv}"/bin/activate
pip3 install 'homeassistant==2021.6.3'

mkdir -p $(dirname "${config}")
test -d "${config}" || cp -r "${srcdir}/test/data/homeassistant" "${config}"
exec python3 -m homeassistant -c "${config}"
