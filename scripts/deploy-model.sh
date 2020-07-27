#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "release model" "$@"
shift $n

set -e
set -x

make "release=${release}" "eval/${release}/models/${model}/best.pth"

rm -fr export/
genienlp export --path "eval/${release}/models/${model}/" -o export/

version=2
if test "${release}" = "main"; then
	model_tag="org.thingpedia.models.contextual"
elif test "${release}" = "universe" ; then
	model_tag="org.thingpedia.models.developer.contextual"
else
	echo "Invalid release (staging models cannot be deployed)"
fi

AWS_PROFILE=oval aws s3 sync export/ "s3://almond-training/staging/inference/${model_tag}:en-v${version}/"

set +x
ADMIN_TOKEN=$(secret-tool lookup almond.nlp_admin_token dev)
curl -v -d '' "https://nlp-staging.almond.stanford.edu/admin/reload/@${model_tag}/en?admin_token=${ADMIN_TOKEN}"
echo
