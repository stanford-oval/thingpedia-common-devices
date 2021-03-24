#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "model" "$@"
shift $n

set -e
set -x

aws s3 sync --exclude '*/dataset/*' --exclude '*/cache/*' --exclude 'iteration_*.pth' --exclude '*_optim.pth' "${model}" ./tmp/model

rm -fr ./tmp/export/
genienlp export --path ./tmp/model -o ./tmp/export/
tar -cJf ./model.tar.xz -C ./tmp/export .

AWS_PROFILE=oval aws s3 cp ./model.tar.xz "s3://thingpedia2/models/en-US/org.thingpedia.models.contextual/latest.tar.xz"
