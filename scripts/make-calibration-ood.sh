#!/bin/bash

set -e
set -x

aws s3 cp s3://geniehai/gcampax/dropped-log.tsv calibration-ood-source.tsv
sed -E -e '/\t(ok|contextual command|ambiguous|redacted|meta-command|chatty)$/d' -e 's/\t/\tnull\t/' -e 's/\t[^\t]*$/\t\$failed ;/' calibration-ood-source.tsv > calibration-ood.tsv
aws s3 cp calibration-ood.tsv s3://geniehai/gcampax/calibration-ood.tsv
