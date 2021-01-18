#!/bin/bash

set -e
set -x
set -o pipefail

# Test that we can generate a (small) dataset for the main + universe devices

test -f config.mk || cat > config.mk <<EOF
developer_key=${THINGENGINE_DEVELOPER_KEY}
EOF

make release=universe subdatasets=1 target_pruning_size=25 max_turns=2 debug_level=2 parallel=1 datadir
