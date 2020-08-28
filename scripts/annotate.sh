#!/bin/bash

srcdir=`dirname $0`
. $srcdir/lib.sh
parse_args "$0" "release=universe device user_nlu_model agent_nlu_model eval_set=dev file_suffix=None offset=1" "$@"
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
  --annotated ${device}/eval/${eval_set}/annotated${file_suffix}.txt \
  --dropped ${device}/eval/${eval_set}/dropped${file_suffix}.txt \
  --user-nlu-server "file://"$(realpath "eval/${release}/models/${user_nlu_model}") \
  --agent-nlu-server "file://"$(realpath "eval/${release}/models/${user_nlu_model}") \
  --thingpedia "eval/${release}/schema.tt" \
  --database-file ${device}/database-map.tsv \
  ${device}/eval/${eval_set}/input${file_suffix}.txt \
  --offset "${offset}" --append \
  "$@"

