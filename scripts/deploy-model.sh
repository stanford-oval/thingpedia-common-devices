#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "release=universe model" "$@"
shift $n

set -e
set -x

aws s3 sync --exclude '*/dataset/*' --exclude '*/cache/*' --exclude 'iteration_*.pth' --exclude '*_optim.pth' "${model}" ./tmp/model

rm -fr ./tmp/export/
genienlp export --path ./tmp/model -o ./tmp/export/
test -f ./tmp/model/calibrator.pkl && cp ./tmp/model/calibrator.pkl ./tmp/export/

version=2
for model_tag in org.thingpedia.models.contextual ; do
	AWS_PROFILE=oval aws s3 sync ./tmp/export/ "s3://almond-training/staging/inference/${model_tag}:en-v${version}/"

	set +x
	ADMIN_TOKEN=$(secret-tool lookup almond.nlp_admin_token dev)
	curl -v -d '' "https://nlp-staging.almond.stanford.edu/admin/reload/@${model_tag}/en?admin_token=${ADMIN_TOKEN}"
	echo
	set -x
done
