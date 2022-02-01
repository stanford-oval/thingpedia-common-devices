#!/bin/bash

set -e
set -x
set -o pipefail

# Generate a (small) dataset for the main + universe devices
make release=universe subdatasets=1 simple_subdatasets=0 target_pruning_size=20 max_turns=2 debug_level=2 parallel=1 datadir

# Translate that dataset to German
make source=user all_names="eval" release=universe requote_skip_errors=true process_data
make source=user all_names="eval" release=universe model_name_or_path=Helsinki-NLP/opus-mt-en-de src_lang=en tgt_lang=de nmt_model=nmt val_batch_size=200 temperature=0.0 translate_data
make source=user all_names="eval" release=universe src_lang=en tgt_lang=de nmt_model=nmt requote_skip_errors=true augment_override_flags= postprocess_data
