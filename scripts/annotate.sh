#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "release device user_nlu_model agent_nlu_model eval_set file_suffix=None offset=1" "$@"
shift $n

if test "${file_suffix}" = "None" ; then
	file_suffix=
fi

set -e

make release="${release}" \
	"eval/${release}/schema.tt" \
	"eval/${release}/models/${user_nlu_model}/best.pth" \
	"eval/${release}/models/${agent_nlu_model}/best.pth"
exec genie manual-annotate-dialog \
  --locale en-US \
  --annotated ${release}/${device}/eval/${eval_set}/annotated${file_suffix}.txt \
  --dropped ${release}/${device}/eval/${eval_set}/dropped${file_suffix}.txt \
  --user-nlu-server "file://"$(realpath "eval/${release}/models/${user_nlu_model}/best.pth") \
  --agent-nlu-server "file://"$(realpath "eval/${release}/models/${user_nlu_model}/best.pth") \
  --thingpedia "eval/${release}/schema.tt" \
  --database-file ${release}/${device}/database-map.tsv \
  ${release}/${device}/eval/${eval_set}/input${file_suffix}.txt \
  --offset "${offset}" \
  "$@"

