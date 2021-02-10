#!/bin/bash

set -e
set -x

test -f dropped-log.tsv || aws s3 cp s3://geniehai/gcampax/dropped-log.tsv dropped-log.tsv

# These are in-domain: ok|contextual command|ambiguous|redacted|meta-command
# We ignore these: bug-tokenize
# out of domain:
sed -E -e '/\t(chatty|phone|foreign language|dialogue-model|gnome|math|new device|new function|policy or remote program|question|skill-help|web search|unintellegible|stream|tutorial)$/!d' -e 's/\t/\tnull\t/' -e 's/\t[^\t]*$/\t\$ood ;/' dropped-log.tsv > calibration-ood.tsv
# junk
sed -E -e '/\t(junk)$/!d' -e 's/\t/\tnull\t/' -e 's/\t[^\t]*$/\t\$junk ;/' dropped-log.tsv > calibration-junk.tsv
aws s3 cp calibration-ood.tsv s3://geniehai/gcampax/calibration-ood.tsv
aws s3 cp calibration-junk.tsv s3://geniehai/gcampax/calibration-junk.tsv
