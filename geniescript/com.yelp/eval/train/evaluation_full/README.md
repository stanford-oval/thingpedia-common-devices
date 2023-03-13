This folder stores the evaluation of a synthetic&fewshotted yelp semantic parser, with azure ID `sliu22/models/thingpedia-GS/multidomain/2_fewshot/1674531365/`.
Evaluation is based on `annotated_delta.tsv` in the parent folder.

- `stats` shows the overall accuracy of this parser. `all_devices, ok = [1]` is the overall accuracy;
- `correct_predictions.tsv` stores correct predictions by this parser, in the format of `id, context, user_uttterance, gold, predicted`;
