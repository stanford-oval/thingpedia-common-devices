#!/bin/bash

set -e
set -x
set -o pipefail

# Test that we can generate a (small) dataset for the main + universe devices

make release=universe subdatasets=1 simple_subdatasets=0 target_pruning_size=20 max_turns=2 debug_level=2 parallel=1 datadir
