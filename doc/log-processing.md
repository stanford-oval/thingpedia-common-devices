# Processing and Analyzing Conversation Logs

This document details the procedures to analyze the commands
collected from users who have agreed to participate in our
research and share their commands with us.

There are two type of logs:
- "passive" logs, which contain only the delexicalized context and
  command. These logs are enabled by agreeing to the consent form
  on any platform.
- "recording" logs, which contain the full conversation, including
  the precise context and agent reply, fully lexicalized, as well
  as any up/downvotes from the user and their feedback. These logs
  are enabled by "Enable recording" in a Web Almond instance.

## Setup

The scripts to download the datasets rely on the `dev-mysql-run`
and `prod-mysql-run` scripts in the [sysadmin-scripts](https://github.com/stanford-oval/sysadmin-scripts)
repository, which allow to perform raw SQL queries against the
database.

The script execute the queries from an SSH session from a machine
that can connect to the database, hence SSH credentials must be
setup first. Credentials are different for dev and for prod.

The config.sh file in sysadmin-scripts must be edited to set
the username and password. Credentials are shared using Dashlane.

Then the scripts `dev-mysql-run` and `prod-mysql-run` must be symlinked
from a directory in PATH, with a command similar to the following (from
inside sysadmin-scripts):
```
ln -s $(pwd)/dev-mysql-run ~/.local/bin/dev-mysql-run
```
(the specific command to use depends on the OS and the $PATH environment
variable). The scripts must be symlinks, they cannot be copied as they
rely on their physical location to find config.sh

NOTE: on some systems, the command "realpath" must also be installed.

## Processing Passive Logs

### Step 1: Download the logs

```bash
./scripts/download-dataset.sh --db {prod|dev} --type log > log.tsv
aws s3 cp s3://geniehai/gcampax/dropped-log.tsv dropped-log.tsv
```

The first command downloads the new log. Direct MySQL access to
almond-cloud is required to run the first command.

The second command downloads the shared copy of the previously dropped sentences.
Dropped sentences are previously-annotated sentences that are not representable in ThingTalk
for various reasons; we use them mainly for OOD detection.

### Step 2: Annotate the logs

```bash
./scripts/annotate-log.js --dropped dropped-log.tsv --id-prefix log log.tsv
```

Replace `--id-prefix log` with `--id-prefix log-dev` if annotating data
from dev.almond.stanford.edu.

The interface is similar to `genie manual-annotate-dialog`: you are presented
with a sentence and its possible interpretation. You can edit an interpretation
with `e $n`, or type a new ThingTalk dialogue state. You can drop the sentence
with `d` followed by a reason.

Use `?` to see the list of valid commands, including the list of valid reasons
to drop a sentence and their abbreviations.

### Step 3: Edit previously-annotated OOD logs

When new functionality is added to Genie, commands that were previously OOD
can become representable in ThingTalk. In that case, we need to reannotate
some of those sentences. To do so:

```bash
./scripts/annotate-log.js --dropped dropped-log.tsv --id-prefix log log.tsv \
  --edit-existing $reason
```

Where `$reason` is a reason to drop the sentence listed in dropped-log.tsv.
Use `cut -f3 dropped-log.tsv | sort -u` to see all possible reasons.

The tool will list all the sentences in `log.tsv` whose ID is marked in dropped-log.tsv
with the given reason. It is then possible to annotate each sentence with
ThingTalk, drop the sentence again with the same reason, or with a different
reason.

**It is highly recommended to make a backup of dropped-log.tsv before executing the command, and check the diff, to avoid data loss.**

### Step 4: Upload results

The newly annotated data should be committed and pushed to the repository.
The new dropped-log.tsv should be uploaded to S3.

## Processing Recording Logs

### Step 1: Download the logs

```bash
mkdir -p ./logs/unsorted/
./scripts/download-dataset.sh --db {prod|dev} --type recordings >> logs/unsorted/{dev|prod}.txt
aws s3 cp s3://geniehai/gcampax/logs/dropped.tsv logs/dropped.tsv
```

The script will append new recording files to `./logs/unsorted/{dev|prod}.txt`.

It is possible to analyze the recordings manually to look for downvotes
or comments. After looking at the logs, the files should be moved to `./logs/seen/`.

### Step 2: Annotate the logs

```bash
./scripts/recording-to-devset.js
```

The interface is similar to `genie manual-annotate-dialog` and `./scripts/annotate-log.js`.
Each dialogue is truncated when the ThingTalk recorded in the log is incorrect,
which would cause the conversation to diverge from the recording.
A dialogue can be truncated explicitly with the `d` command.
The `d` command also adds a note to `./logs/dropped.tsv`.

Dialogues whose ID is already present anywhere in the dev set, few-shot
training set, or in `./logs/dropped.tsv`, are not processed again, and
need to be edited manually.

Note that the convention for the reasons to drop a dialogue is different than the
convention used for dropped-log.tsv, because all out-of-domain dialogues
are grouped under the `ood` category. Use `?` to see the list of reasons.

### Step 4: Upload results

The newly annotated data should be committed and pushed to the repository.
The new logs/dropped.tsv should be uploaded to S3.
