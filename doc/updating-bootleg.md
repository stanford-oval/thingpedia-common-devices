# Step 1: Extract Oracle Types

```
genienlp train --ned_retrieve_method entity-type-oracle --ned_dump_entity_type_pairs --train_iterations 1 --data tmp/dataset/ --save tmp/model --train_tasks almond_dialogue_nlu --preserve_case --exist_ok --skip_cache --train_languages en --eval_languages en --database_dir tmp/bootleg/ --model TransformerSeq2Seq --pretrained_model facebook/bart-large --eval_set_name eval --train_batch_tokens 1500 --val_batch_size 2000 --seed 1234 --do_ned --ned_domains thingpedia --add_entities_to_text append --ned_normalize_type strict --almond_type_mapping oracle-type-mapping.json
```

# Step 2: Analyze

```
genienlp oracle-vs-bootleg --bootleg_labels path-to/train_bootleg/bootleg_wiki/bootleg_labels.jsonl --oracle_labels tmp/dataset/train_labels.jsonl --database_dir tmp/bootleg/ --almond_type_mapping_path bootleg-type-mapping.json  --ned_domains thingpedia
```

Output is first a table with:
- Soft precision: percent of entities predicted by Bootleg that are true according to the oracle (ignoring types)
- Strict recall: percent of oracle entities that are predicted by Bootleg with the right type
- Soft recall: percent of oracle entities that are predicted by Bootleg with any (normalized) type

Then it prints, for every normalized type, the most likely confounding types and most likely mispredicted entities.
