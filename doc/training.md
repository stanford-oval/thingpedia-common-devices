# Workflow: Building A Dialogue Model

When building a model for a specific release channel of thingpedia-common-devices,
you should first generate a dataset, then train the model, and then evaluate the model.

## Generating The Dataset

You can generate a dataset locally with:
```bash
make -j release=$release datadir
```
(e.g. `make -j release=main datadir`)

You can see a number of hyperparameters on the make command line. Look for "hyperparameters"
in the [Makefile](../Makefile) for the full list.

A standard-sized dataset takes about 6 hours on a machine with at least 8 cores and at least
60GB of RAM. A smaller dataset can be generated for local testing with:
```bash
make release=$release subdatasets=1 target_pruning_size=25 max_turns=2 debug_level=2 datadir
```
This only takes a few minutes.

If you have [genie-k8s](https://github.com/stanford-oval/genie-k8s) configure, you can also
generate a full-sized dataset with:
```bash
make syncup
cd ../genie-k8s
./generate-dataset.sh --experiment $release --dataset $dataset
```

`$dataset` is a short arbitrary name that will be used to refer to your dataset.

Don't forget to complete the `config.mk` before using `make syncup`

## Training The Model

At this point, you must use genie-k8s to train a model:
```bash
./train.sh --experiment $release --dataset $dataset --model $model --task almond_dialogue_nlu -- $flags
```

Notice the `--` separating the model name and the hyperparameter flags. Look at
the [tracking spreadsheet](https://docs.google.com/spreadsheets/d/159oZV2aE4Jy7lTzyweSIuy03tU4rh1HPPIr8M8A63wo/edit#gid=1721165007)
for the current set of flags to use for the best model in each release.

## Evaluating The Model

You can evaluate a single model with:
```bash
make release=$release model=$model eval_set={dev | test} evaluate
```
For the dev set, the model is evaluated on data contained in `eval/$release/dev/annotated.txt`
(multi-device dialogues) and in `$release/*/eval/dev/annotated.txt` (single-device dialogues).

If genie-k8s is configured correctly, the model will be downloaded automatically. If not,
the model must be downloaded and placed in `eval/$release/models/$model`.

The output of the command is a CSV line with:
- evaluation set
- number of evaluation dialogues
- number of evaluation turns
- % of completely correct dialogues (exact match, slot only)
- % of accuracy first turns	(exact match, slot only)
- turn by turn accuracy (exact match, slot only)
- accuracy up to first error (exact match, slot only)
- average turn at which the first error occurs (exact match, slot only)

You can also keep mutiple models to evaluate by setting `$release_eval_{train|dev}_models` in
`config.mk`. For example:
```make
universe_eval_dev_models += gcampax/1
```

If you do that, you can use `make evaluate-all` to evaluate all models at once.
