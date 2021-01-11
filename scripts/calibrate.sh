#!/bin/sh

set -e
set -x

rm -fr ./tmp/datadir
mkdir -p ./tmp/datadir

# first calibrate only on the in-domain dataset
make datadir/fewshot
ln -s ../../datadir/fewshot ./tmp/datadir/almond
genienlp predict \
 --path ./tmp/model \
 --data ./tmp/datadir \
 --eval_dir ./tmp/calibration-indomain \
 --task almond_dialogue_nlu \
 --silent \
 --overwrite \
 --evaluate valid \
 --save_confidence_features \
 --confidence_feature_path "./tmp/calibration-indomain/confidence_feature_file.pkl" \
 --mc_dropout --mc_dropout_num 20 \
 "$@"

genienlp calibrate --save "./tmp/model" --confidence_path "./tmp/calibration-indomain/confidence_feature_file.pkl" --plot
cp ./tmp/model/{calibrator.pkl,precision-recall.svg,threshold.svg,pass-accuracy.svg} ./tmp/calibration-indomain

# now calibrate on the in-domain+out-of-domain dataset
rm ./tmp/datadir/almond
make datadir/calibration
ln -s ../../datadir/calibration ./tmp/datadir/almond
genienlp predict \
  --path ./tmp/model \
  --data ./tmp/datadir \
  --eval_dir ./tmp/calibration-ood \
  --task almond_dialogue_nlu \
  --silent \
  --overwrite \
  --evaluate valid \
  --save_confidence_features \
  --confidence_feature_path "./tmp/calibration-ood/confidence_feature_file.pkl" \
  --mc_dropout --mc_dropout_num 20 \
  "$@"

genienlp calibrate --save "./tmp/model" --confidence_path "./tmp/calibration-ood/confidence_feature_file.pkl" --plot
cp ./tmp/model/{calibrator.pkl,precision-recall.svg,threshold.svg,pass-accuracy.svg} ./tmp/calibration-ood

