`annotated.txt`, the legacy annotated data, is broken down into 4 files, named `annotated_batch*.txt` (1-4).

`annotated_batch*.tsv` is the corresponding annotated contextual tsv files, using command:

``genie process-delta --locale en-US --target-language thingtalk --deduplicate --no-tokenized --thingpedia geniescript/com.yelp/manifest.tt --side user -o annotated_batch*.tsv annotated_batch*.txt``

`annotated_batch5_other.txt` is manually annotated for coverage of "show me another one". The corresponding `annotated_batch5_other.tsv` is produced by:

``genie dialog-to-contextual --locale en-US --target-language thingtalk --deduplicate --no-tokenized --thingpedia geniescript/com.yelp/manifest.tt --side user -o annotated_batch5_other.tsv annotated_batch5_other.txt``

`annotated_delta.tsv` combines all `annotated_batch*.tsv` (in sentence state representation), and should be used for training.

`annotated_turn.tsv` is obtained by running `genie dialog-to-contextual` on `annotated.txt`, which uses the legacy dialogue state representation