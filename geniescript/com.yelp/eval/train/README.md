`annotated.txt` is broken down into 4 files, named `annotated_batc*.txt`.

`annotated_batch*.tsv` is the corresponding annotated contextual tsv files, using command:

``genie process-delta --locale en-US --target-language thingtalk --deduplicate --no-tokenized --thingpedia geniescript/com.yelp/manifest.tt --side user -o annotated_batch*.tsv annotated_batch*.txt``

`annotated_delta.tsv` combines all `annotated_batch*.tsv` (in sentence state representation)

`annotated_turn.tsv` is obtained by running `genie dialog-to-contextual` on `annotated.txt`, which uses the legacy dialogue state representation