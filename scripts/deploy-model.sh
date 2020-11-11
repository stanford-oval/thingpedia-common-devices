#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "release=universe model" "$@"
shift $n

set -e
set -x

make "release=${release}" "eval/${release}/models/${model}/best.pth"

rm -fr export/
genienlp export --path "eval/${release}/models/${model}/" -o export/

version=2

for model_tag in org.thingpedia.models.contextual org.thingpedia.models.developer.contextual ; do
	AWS_PROFILE=oval aws s3 sync export/ "s3://almond-training/staging/inference/${model_tag}:en-v${version}/"

	set +x
	ADMIN_TOKEN=$(secret-tool lookup almond.nlp_admin_token dev)
	curl -v -d '' "https://nlp-staging.almond.stanford.edu/admin/reload/@${model_tag}/en?admin_token=${ADMIN_TOKEN}"
	echo
	set -x
done
