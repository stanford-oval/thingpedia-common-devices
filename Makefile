-include ./config.mk

NULL =

all_releases := main universe staging
# this indirection is for the purpose of [genie-k8s](https://github.com/stanford-oval/genie-k8s),
# which sets experiment=
experiment ?= main
release ?= $(experiment)
# dev or test
eval_set ?= dev
# model to train or evaluate
model ?=

devices_fn = $(foreach d,$(wildcard $(1)/*/manifest.tt),$(patsubst %/manifest.tt,%,$(d)))
pkgfiles_fn = $(wildcard $(1)/*/package.json)

# *_devices is the devices in this release, and all devices in a "more stable" release
builtin_devices := $(call devices_fn,builtin)
main_devices := $(builtin_devices) $(call devices_fn,main)
universe_devices := $(main_devices) $(call devices_fn,universe)
staging_devices := $(universe_devices) $(call devices_fn,staging)
main_pkgfiles := $(call pkgfiles_fn,main)
universe_pkgfiles := $(main_pkgfiles) $(call pkgfiles_fn,universe)
staging_pkgfiles := $(universe_pkgfiles) $(call pkgfiles_fn,staging)

# hyperparameters that can be overridden on the cmdline
template_file ?= thingtalk/en/dialogue.genie
dataset_file ?= eval/$(release)/dataset.tt
schema_file ?= eval/$(release)/schema.tt
paraphrases_user ?= eval/$(release)/paraphrase.tsv $(foreach d,$($(release)_devices),$(d)/eval/paraphrase.tsv)
eval_files ?= eval/$(release)/$(eval_set)/annotated.txt $(foreach d,$($(release)_devices),$(d)/eval/$(eval_set)/annotated.txt)
fewshot_train_files ?= eval/$(release)/train/annotated.txt $(foreach d,$($(release)_devices),$(d)/eval/train/annotated.txt)

synthetic_flags ?= \
	dialogues \
	multifilters \
	nostream \
	notablejoin \
	projection \
	projection_with_filter \
	schema_org \
	undefined_filter \
	$(NULL)

target_pruning_size ?= 100
minibatch_size ?= 300
target_size ?= 1
subdatasets ?= 6
subdataset_ids := $(shell seq 1 $(subdatasets))
max_turns ?= 4
max_depth ?= 8
debug_level ?= 1
update_canonical_flags ?= --algorithm bert,adj,bart --paraphraser-model ./models/paraphraser-bart
synthetic_expand_factor ?= 5
paraphrase_expand_factor ?= 10
quoted_fraction ?= 0.05

generate_flags ?= $(foreach v,$(synthetic_flags),--set-flag $(v)) --target-pruning-size $(target_pruning_size) --max-turns $(max_turns) --maxdepth $(max_depth)
custom_gen_flags ?=

template_deps = \
	$(geniedir)/languages/thingtalk/*.js \
	$(geniedir)/languages/thingtalk/dialogue_acts/*.js \
	$(geniedir)/languages/thingtalk/*.genie \
	$(geniedir)/languages/thingtalk/en/*.genie \
	$(geniedir)/languages/thingtalk/en/dlg/*.genie

evalflags ?=

# configuration (should be set in config.mk)
eslint ?= node_modules/.bin/eslint
thingpedia_cli ?= node_modules/.bin/thingpedia

geniedir ?= node_modules/genie-toolkit
memsize ?= 9000
parallel ?= 7
genie ?= node --experimental_worker --max_old_space_size=$(memsize) $(geniedir)/tool/genie.js

thingpedia_url ?= https://thingpedia.stanford.edu/thingpedia
developer_key ?= invalid

s3_bucket ?=
genie_k8s_project ?=
genie_k8s_owner ?=

.PRECIOUS: %/node_modules
.PHONY: all clean lint

all: $($(release)_pkgfiles:%/package.json=build/%.zip)
	@:

build/%.zip: % %/node_modules
	mkdir -p `dirname $@`
	cd $< ; zip -x '*.tt' '*.yml' 'node_modules/.bin/*' 'icon.png' 'eval/*' 'simulation/*' 'database-map.tsv' -r $(abspath $@) .

%/node_modules: %/package.json %/yarn.lock
	mkdir -p $@
	cd `dirname $@` ; yarn --only=prod --no-optional
	touch $@

%: %/package.json %/*.js %/node_modules
	touch $@

$(schema_file): $(addsuffix /manifest.tt,$($(release)_devices))
	cat $^ > $@.tmp
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

$(dataset_file): $(addsuffix /dataset.tt,$($(release)_devices))
	cat $^ > $@.tmp
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

eval/$(release)/database-map.tsv: $(addsuffix /database-map.tsv,$($(release)_devices))
	for f in $^ ; do \
	  sed 's|\t|\t../../'`dirname $$f`'/|g' $$f >> $@.tmp ; \
	done
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

entities.json:
	$(thingpedia_cli) --url $(thingpedia_url) --developer-key $(developer_key) --access-token invalid \
	  download-entities -o $@

parameter-datasets.tsv:
	$(thingpedia_cli) --url $(thingpedia_url) --developer-key $(developer_key) --access-token invalid \
	  download-entity-values --manifest $@.tmp --append-manifest -d parameter-datasets
	$(thingpedia_cli) --url $(thingpedia_url) --developer-key $(developer_key) --access-token invalid \
	  download-string-values --manifest $@.tmp --append-manifest -d parameter-datasets
	mv $@.tmp $@

eval/$(release)/synthetic-%.txt : $(schema_file) $(dataset_file) $(template_deps) entities.json
	$(genie) generate-dialogs \
	  --locale en-US --target-language thingtalk \
	  --template $(geniedir)/languages/$(template_file) \
	  --thingpedia $(schema_file) --entities entities.json --dataset $(dataset_file) \
	  -o $@.tmp -f txt $(generate_flags) --debug $(debug_level) $(custom_gen_flags) --random-seed $@ \
	  -n $(target_size) -B $(minibatch_size)
	mv $@.tmp $@

eval/$(release)/synthetic.txt: $(foreach v,$(subdataset_ids),eval/$(release)/synthetic-$(v).txt)
	cat $^ > $@

eval/$(release)/synthetic-%.user.tsv : eval/$(release)/synthetic-%.txt $(schema_file)
	$(genie) dialog-to-contextual \
	  --locale en-US --target-language thingtalk --deduplicate \
	  --thingpedia $(schema_file) --side user --flags S --id-prefix $*: \
	  -o $@.tmp $<
	mv $@.tmp $@

eval/$(release)/synthetic.user.tsv: $(foreach v,$(subdataset_ids),eval/$(release)/synthetic-$(v).user.tsv)
	$(genie) deduplicate --contextual -o $@.tmp $^
	mv $@.tmp $@

eval/$(release)/synthetic-%.agent.tsv : eval/$(release)/synthetic-%.txt $(schema_file)
	$(genie) dialog-to-contextual \
	  --locale en-US --target-language thingtalk --deduplicate \
	  --thingpedia $(schema_file) --side agent --flags S --id-prefix $*: \
	  -o $@.tmp $<
	mv $@.tmp $@

eval/$(release)/synthetic.agent.tsv: $(foreach v,$(subdataset_ids),eval/$(release)/synthetic-$(v).agent.tsv)
	$(genie) deduplicate --contextual -o $@.tmp $^
	mv $@.tmp $@

eval/$(release)/augmented.user.tsv : eval/$(release)/synthetic.user.tsv $(schema_file) $(paraphrases_user) parameter-datasets.tsv
	$(genie) augment -o $@.tmp \
	  --locale en-US \
	  --target-language thingtalk --contextual \
	  --thingpedia $(schema_file) \
	  --parameter-datasets parameter-datasets.tsv \
	  --synthetic-expand-factor $(synthetic_expand_factor) \
	  --quoted-paraphrasing-expand-factor $(paraphrase_expand_factor) \
	  --no-quote-paraphrasing-expand-factor $(paraphrase_expand_factor) \
	  --quoted-fraction $(quoted_fraction) \
	  --no-debug \
	  --parallelize $(parallel) \
	  $(paraphrases_user) $<
	mv $@.tmp $@

eval/$(release)/$(eval_set)/agent.tsv : $(eval_files) $(schema_file)
	$(genie) dialog-to-contextual \
	  --locale en-US --target-language thingtalk --no-tokenized \
	  --thingpedia $(schema_file) --side agent --flags E \
	  -o $@.tmp $(eval_files)
	mv $@.tmp $@

eval/$(release)/$(eval_set)/user.tsv : $(eval_files) $(schema_file)
	$(genie) dialog-to-contextual \
	  --locale en-US --target-language thingtalk --no-tokenized \
	  --thingpedia $(schema_file) --side user --flags E \
	  -o $@.tmp $(eval_files)
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

eval/$(release)/train/user.tsv : $(fewshot_train_files) $(schema_file)
	$(genie) dialog-to-contextual \
	  --locale en-US --target-language thingtalk --no-tokenized \
	  --thingpedia $(schema_file) --side user \
	  -o $@.tmp $(fewshot_train_files)
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

eval/$(release)/$(eval_set)/%.dialogue.results: eval/$(release)/models/%/best.pth $(eval_files) $(schema_file) eval/$(release)/database-map.tsv parameter-datasets.tsv
	mkdir -p eval/$(release)/$(eval_set)/$(dir $*)
	$(genie) evaluate-dialog \
	  --url "file://$(abspath $(dir $<))" \
	  --thingpedia $(schema_file) \
	  --target-language thingtalk \
	  --database-file eval/$(release)/database-map.tsv \
	  --parameter-datasets parameter-datasets.tsv \
	  --debug --csv-prefix $(eval_set) --csv $(evalflags) \
	  -o $@.tmp $(eval_files) > eval/$(release)/$(eval_set)/$*.dialogue.debug.tmp
	mv eval/$(release)/$(eval_set)/$*.dialogue.debug.tmp eval/$(release)/$(eval_set)/$*.dialogue.debug
	mv $@.tmp $@

eval/$(release)/$(eval_set)/%.nlu.results: eval/$(release)/models/%/best.pth eval/$(release)/$(eval_set)/user.tsv $(schema_file)
	$(genie) evaluate-server \
	  --url "file://$(abspath $(dir $<))" \
	  --thingpedia $(schema_file) -l en-US \
	  --contextual \
	  --split-by-device --complexity-metric turn_number --max-complexity 3 \
	  --debug --csv-prefix $(eval_set) --csv $(evalflags) \
	  -o $@.tmp eval/$(release)/$(eval_set)/user.tsv > eval/$(release)/$(eval_set)/$*.nlu.debug.tmp
	mv eval/$(release)/$(eval_set)/$*.nlu.debug.tmp eval/$(release)/$(eval_set)/$*.nlu.debug
	mv $@.tmp $@

# NOTE: there is no augmentation of agent sentences! The agent networks (policy & NLG) operate with QUOTED tokens exclusively
datadir/agent: eval/$(release)/synthetic.agent.tsv eval/$(release)/dev/agent.tsv
	mkdir -p $@
	cp eval/$(release)/synthetic.agent.tsv $@/
	cp eval/$(release)/synthetic.agent.tsv $@/train.tsv ; \
	cp eval/$(release)/dev/agent.tsv $@/eval.tsv ; \
	touch $@

datadir/user: eval/$(release)/synthetic.user.tsv eval/$(release)/augmented.user.tsv eval/$(release)/dev/user.tsv
	mkdir -p $@
	cp eval/$(release)/synthetic.user.tsv $@/
	cp eval/$(release)/augmented.user.tsv $@/train.tsv ; \
	cp eval/$(release)/dev/user.tsv $@/eval.tsv ; \
	touch $@

datadir/fewshot: eval/$(release)/train/user.tsv eval/$(release)/dev/user.tsv
	mkdir -p $@/user
	cp eval/$(release)/train/user.tsv $@/user/train.tsv
	cp eval/$(release)/dev/user.tsv $@/user/eval.tsv
	touch $@

datadir: datadir/agent datadir/user datadir/fewshot $(foreach v,$(subdataset_ids),eval/$(release)/synthetic-$(v).txt)
	cat eval/$(release)/synthetic-*.txt > $@/synthetic.txt
	python3 ./scripts/measure.py $@ > $@/stats
	touch $@

clean:
	rm -fr build/
	rm -fr entities.json
	for exp in $(all_releases) ; do \
		rm -rf $$exp/schema.tt $$exp/dataset.tt $$exp/synthetic* parameter-datasets* $$exp/augmented* ; \
	done

lint:
	for d in $($(release)_devices) ; do \
		echo $$d ; \
		$(thingpedia_cli) lint-device --manifest $$d/manifest.tt --dataset $$d/dataset.tt ; \
		test ! -f $$d/package.json || $(eslint) $$d/*.js ; \
	done

evaluate: eval/$(release)/$(eval_set)/$(model).dialogue.results
	@echo $<
	@cat $<

evaluate-detailed: eval/$(release)/$(eval_set)/$(model).nlu.results
	@echo $<
	@cat $<

evaluate-all:
	@for m in $($(release)_eval_$(eval_set)_models) ; do make --no-print-directory model=$$m evaluate ; done

eval/$(release)/models/%/best.pth:
	mkdir -p eval/$(release)/models/$(if $(findstring /,$*),$(dir $*),)
	aws s3 sync --exclude '*/dataset/*' --exclude '*/cache/*' --exclude 'iteration_*.pth' --exclude '*_optim.pth' s3://geniehai/$(if $(findstring /,$*),$(dir $*),$(genie_k8s_owner)/)models/$(genie_k8s_project)/$(release)/$(notdir $*)/ eval/$(release)/models/$*/

syncup:
	aws s3 sync --delete --exclude 'node_modules/*' --exclude '*/node_modules/*' --exclude '.embeddings/*' --exclude '*/models/*' --exclude '*/datasets/*' --exclude 'datadir/*' --exclude '*/synthetic*' --exclude '*/augmented*' --exclude '.git/*' --exclude '.nyc_output/*' --no-follow-symlinks . s3://$(s3_bucket)/$(genie_k8s_owner)/workdir/$(genie_k8s_project)/
	# HACK: sync the builtin folder separately with --follow-symlinks
	aws s3 sync --delete --exclude 'node_modules/*' --exclude '*/node_modules/*' --exclude '.embeddings/*' --exclude '*/models/*' --exclude '*/datasets/*' --exclude 'datadir/*' --exclude '*/synthetic*' --exclude '*/augmented*' --exclude '.git/*' --exclude '.nyc_output/*' --follow-symlinks builtin/ s3://$(s3_bucket)/$(genie_k8s_owner)/workdir/$(genie_k8s_project)/builtin/

syncdown:
	aws s3 sync s3://$(s3_bucket)/$(genie_k8s_owner)/workdir/$(genie_k8s_project)/ .

eval/$(release)/datasets/%/stats:
	aws s3 cp s3://$(s3_bucket)/$(if $(findstring /,$*),$(dir $*),$(genie_k8s_owner)/)dataset/$(genie_k8s_project)/$(release)/$(notdir $*)/stats $@ || true
	sed -i 's|datadir|'$(release)/$*'|g' $@

training-set-statistics: $(foreach v,$($(release)_training_sets),eval/$(release)/datasets/$(v)/stats)
	@echo "dataset	num_dlgs	num_synthetic	num_turns	ctx_entropy	utt_entropy	tgt_entropy	turns_per_dlgs	unique_ctxs"
	@cat $^
