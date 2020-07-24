#!/bin/bash

set -e
set -x

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "release model" "$@"
shift $n

make "release=${release}" "eval/${release}/models/${model}/best.pth"

rm -fr export/
genienlp export --path "eval/${release}/models/${model}/" -o export/

version=2
AWS_PROFILE=oval aws s3 sync export/ "s3://almond-training/staging/inference/org.thingpedia.models.contextual:en-v${version}/"

set +x
ADMIN_TOKEN=$(secret-tool lookup almond.nlp_admin_token dev)
curl -v -d '' "https://nlp-staging.almond.stanford.edu/admin/reload/@org.thingpedia.models.contextual/en?admin_token=${ADMIN_TOKEN}"
