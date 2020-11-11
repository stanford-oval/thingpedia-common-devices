# Maintainer Workflows

These are the commands used by maintainers of this repository.

## Uploading All Devices To Thingpedia

Use:
```bash
./scripts/upload-all.sh $release
```

To package and upload all devices in a specific release to the Thingpedia
at almond-dev.stanford.edu (the testing Thingpedia).

## Deploying a Model

Use:
```bash
./scripts/deploy-model.sh --release $release --model $model
```

To deploy the new model as the default model for almond-dev.stanford.edu.

## Downloading Train Almond & Paraphrase Datasets

Use:
```bash
./scripts/download-dataset.sh -t $type > dataset.tsv
```
where `$type` is `online` for Train Almond and `turking%` for MTurk paraphrasing.

You need a working `prod-mysql-run` command to use this script.

For paraphrase, you should requote the dataset:
```
genie requote -o dataset-requoted.tsv dataset.tsv
```

You should typecheck the new data with:
```
make release=staging eval/staging/schema.tt
genie typecheck --interactive --cache typecheck-cache.txt dataset.tsv -o new-dataset.tsv --dropped new-dataset-dropped.tsv --thingpedia eval/staging/schema.tt
```

Then use to merge the typechecked data with the existing evaluation and paraphrase sets:
```
./scripts/process-online.js -t $type
```
where `$type` is `manual` for Train Almond and `paraphrase` for paraphrasing.
