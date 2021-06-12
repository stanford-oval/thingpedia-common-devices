# Workflow: Adding A New Device

To add a new device, you should make a new directory named the ID of the device,
in the directory for the relevant release. All new devices start in the `staging` release.

Then add all the relevant files, as described in [device-layout.md](device-layout.md).
Documentation for the manifest, dataset, and JS code is provided in Thingpedia on [how to create a new device](https://almond.stanford.edu/doc/thingpedia-tutorial-hello-world.md).

Make sure your device has name and description annotation in `manifest.tt`.
You can run `make release=$release lint` (e.g. `make release=main lint` for a device
in the `main` release) to check for common mistakes or syntax errors.

## Testing The Code

You should add tests for every new device, to ensure the implementation is correct.
There are two types of tests you can add. 

### Unit Testing
Unit tests test the individual APIs (queries and actions) exposed by your device.

The test framework supports devices 
that require no authentication or username-password style 
[basic authentication](https://almond.stanford.edu/thingpedia/developers/thingpedia-device-intro-auth-n-discovery.md#username-and-password). 

Add the tests in the `test/unit/$release` folder, with a JS file named after your
device. For example, if you want to test your device named `com.xxx` in the `staging` release,
create a test file `test/unit/staging/com.xxx.js`.
If your device needs authentication, add a file `com.xxx.json` containing
the complete device state in the directory `test/credentials/`.
A couple examples have been added for your reference. 

To run the tests, run `npx node ./test/unit com.xxx`. Run `npx node ./test/unit $release` (e.g. `npx node ./test/unit universe`)
to run all unit tests for all devices in a certain release.

### Scenario Testing

Scenario tests will load your device in an complete assistant, and test end-to-end
that the assistant responds correctly to user's commands. It is a way to catch regressions
and unexpected failures.

At first, you'll write scenario tests using `\t` commands, which emulates the user typing
ThingTalk code in their chat window directly. You can use these test to check that your skill
is returning data compatible with the function signatures declared in the manifest, and that the agent
replies correctly. Later, once a model has been trained for the skill, the user commands can
be replaced with natural language comamnds, to act as an end-to-end regression test.

To add a scenario test, add a new dialogue in the `eval/scenarios.txt` file in the device folder.
Dialogues are separated by `====` (4 equal signs). The format of a dialogue alternates user turns, prefixed with `U:`, and agent turns, prefixed
with `A:`. The user speaks first, and the agent speaks last.
The first line in a dialogue starting with `#` contains the ID of the test, and the other
`#` lines are comments.

At every turn, the system emulates inputs with the given user utterance, then checks
that the reply from the agent matches the regular expression indicated in the agent turn.
See the [scenario tests for org.thingpedia.weather](../universe/org.thingpedia.weather/eval/scenarios.txt)
for examples.

## Building The Dialogue Model

To create a high-quality dialogue model for your device, you need at least a small amount of
manually annotated data. You can write a few dialogues by hand, or collect from existing benchmark datasets
(be mindful of the license if you do so).

### Collecting The Data
Unannotated raw data for development should be saved in a file called in `eval/dev/input.txt`.
The format alternates between user turns, prefixed with `U:`, and agent turns prefixed with `A:`.
The user speaks first _and last_.
Lines starting with `#` are comments, except the first `#` line contains the ID of the dialogue.
By convention, dialogues ID should include the source of the data followed by `/` followed by the original
ID of the dialogue or a sequential number. For example, data collected by Train Almond has ID `online/...`
where ... is a sequential number.

Data for the dev set goes in `eval/dev/input.txt`. Data to fine-tune the trained model goes in `eval/train/input.txt`.
Data for the test set goes in `eval/test/input.txt`.

### Training The First (Poor) Model
To annotate the data, you need to build a basic model of the device, using a purely synthesized
dataset. Follow the instructions in [training.md](training.md) to generate a dataset.

At this stage, you must train two models: one to interpret user sentences, and one to interpret
agent sentences. 

With [genie-k8s](https://github.com/stanford-oval/genie-k8s), use:
```bash
make syncup
cd ../genie-k8s
./generate-dataset.sh --experiment staging --dataset $dataset
```
... some hours later ... 
```bash
./train.sh --experiment staging --dataset $dataset --model $modeluser --task almond_dialogue_nlu -- $flags
./train.sh --experiment staging --dataset $dataset --model $modelagent --task almond_dialogue_nlu_agent -- $flags
```
Set `$modeluser` and `$modelagent` to distinct and memorable names. Choose the flags
from the [tracking spreadsheet](https://docs.google.com/spreadsheets/d/159oZV2aE4Jy7lTzyweSIuy03tU4rh1HPPIr8M8A63wo/edit#gid=1721165007).

The user NLU model is used to interpret sentence coming from the user, and will be the model
that we will work to improve and deploy. The agent NLU model is only used during annotation,
and we'll discard it after we're done with annotation.

### Preparing The Simulation Data

To annotate, we'll also need some simulation data containing the result of your queries.
Collect all the entities mentioned in your dialogue evaluation data, and then run the API
to collect some data around those entities. Convert that data to the format returned by
your Thingpedia query function, then save it to a JSON file in your device folder.

Then edit `database-map.tsv` in your device to add a line containing the fully-qualified
function name of each query (class name, colon `:`, function name), followed by a tab,
followed by the path to the JSON file containing simulation data for that function.
The path must be _relative_ to the location of the `database-map.tsv` file. For example:
```
com.xxx:song    eval/songs_db.json
com.xxx:artist  eval/artists_db.json
```

### Annotating

Given the two initial models, we can proceed to annotate the data:
```bash
./scripts/annotate.sh --release staging --device com.xxx --user_nlu_model $modeluser --agent_nlu_model $modelagent \
  --eval_set dev --offset 1
```

See the [ThingTalk guide](https://wiki.almond.stanford.edu/thingtalk/guide) to learn how
to write ThingTalk.
At any point, you can interrupt the process by typing `q` or pressing Ctrl-C, and then resume it by passing
the offset of the dialogue to start from, in the `input.txt` order.

At the end of annotation, you can use `make release=staging model=$modeluser evaluate` to
evaluate the trained model on the data for the new device (as well as everything else
in the release).

### Training A Better Model

Now that we have annotated evaluation data (and few-shot training data, if you have it),
we can go ahead and train the user NLU model again, and we should observe the accuracy go up.

You can also use the error analysis files produced by evaluation to identify dialogue turns
that interpreted incorrectly. You can then add annotations to your manifest.tt, or add
new aspects of the general dialogue models by changing genie-toolkit.

### (Optional) Adding Paraphrase Data

Optionally, you can add paraphrase data to improve the quality of the dialogue model. Add this
data as `eval/paraphrase.tsv` in your device folder. The file is in _contextual dataset format_,
that is, tab separated:
```
<turn id>   <context>   <utterance> <target>
```
Where `<context>` is NN-syntax ThingTalk context (agent state before the utterance) and
`<target>` is NN-syntax ThingTalk target (user state after the utterance). The context is `null`
at the first turn. The utterance should be tokenized and in quoted format (that is, use
`QUOTED_STRING_0` and similar tokens in place of real parameter values).

## Submitting your device to Thingpedia
To submit your device for inclusion in Thingpedia, add all your files and prepare a pull
request. The repository maintainer will review it and then, when approve, upload it to
Thingpedia.
