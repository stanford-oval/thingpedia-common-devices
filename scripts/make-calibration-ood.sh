#!/bin/bash

set -e
set -x

test -f dropped-log.tsv || aws s3 cp s3://geniehai/gcampax/dropped-log.tsv dropped-log.tsv

# These are in-domain: ok|contextual command|ambiguous|meta-command|skill-help|stream|timer
# We ignore these: bug-tokenize|dialogue-model|redacted
# out of domain:
sed -E -e '/\t(chatty|faq|foreign language|junk|math|new device|new function|phone|policy or remote program|question|schemaorg|tutorial|unintellegible|web search)$/!d' -e 's/\t/\tnull\t/' -e 's/\t[^\t]*$/\t\$ood ;/' dropped-log.tsv > calibration-ood.tsv
# junk
sed -E -e '/\t(junk)$/!d' -e 's/\t/\tnull\t/' -e 's/\t[^\t]*$/\t\$junk ;/' dropped-log.tsv > calibration-junk.tsv
aws s3 cp calibration-ood.tsv s3://geniehai/gcampax/calibration-ood.tsv
aws s3 cp calibration-junk.tsv s3://geniehai/gcampax/calibration-junk.tsv
