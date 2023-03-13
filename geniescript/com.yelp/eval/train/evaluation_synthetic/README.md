This folder stores the evaluation of a synthetic yelp semantic parser, with azure ID `sliu22/models/thingpedia-GS/multidomain/1/1670026649`.
Evaluation is based on `annotated_delta.tsv` in the parent folder.

- `stats` shows the overall accuracy of this parser. `all_devices, ok = [0.6687306501547987]` is the overall accuracy;
- `correct_predictions.tsv` stores correct predictions by this parser, in the format of `id, context, user_uttterance, gold, predicted`;
- `syntaxterrors_predictions.tsv` stores predictions with syntax errors by this parser, in the format of `id, context, user_uttterance, gold, predicted`;
- `wrong_predictions.tsv` stores wrong predictions (but correct syntax) by this parser, in the format of `id, context, user_uttterance, gold, predicted`;

The total number of results in the three `tsv` files should be equal to the total number of data in `annotated_delta.tsv`.
