#!/bin/bash

set -e
set -x

test -f dropped-log.tsv || aws s3 cp s3://geniehai/gcampax/dropped-log.tsv dropped-log.tsv

# These are in-domain: ok|contextual command|ambiguous|meta-command|skill-help|stream
# We ignore these: bug-tokenize|dialogue-model|redacted
# out of domain:
sed -E -e '/\t(chatty|faq|foreign language|junk|math|new device.*|new function.*|phone|policy or remote program|question|schemaorg|tutorial|unintellegible|web search|junk)$/!d' -e 's/\t/\tnull\t/' -e 's/\t[^\t]*$/\t\$ood ;/' dropped-log.tsv > calibration-ood.tsv

# Add all the commands that come in the staging devices (which are implicitly "new device")
make release=staging eval/staging/schema.tt
genie dialog-to-contextual -o staging-devtrain.tsv --thingpedia eval/staging/schema.tt \
  --side user --flags E --id-prefix staging/ --deduplicate --no-tokenized --ignore-errors \
  staging/*/eval/dev/annotated.txt staging/*/eval/train/annotated.txt

sed -E -e 's/\t\$dialogue [^\t]*$/\t\$ood ;/' staging-devtrain.tsv >> calibration-ood.tsv

