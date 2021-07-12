-include ./config.mk

NULL =

all_releases := main universe staging
# this indirection is for the purpose of [genie-k8s](https://github.com/stanford-oval/genie-k8s),
# which sets experiment=
experiment ?= universe
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
dataset_file ?= eval/$(release)/dataset.tt
schema_file ?= eval/$(release)/schema.tt
paraphrases_user ?= eval/$(release)/paraphrase.tsv $(wildcard $(foreach d,$($(release)_devices),$(d)/eval/paraphrase.tsv))
eval_files ?= eval/$(release)/$(eval_set)/annotated.txt $(wildcard $(foreach d,$($(release)_devices),$(d)/eval/$(eval_set)/annotated.txt))
fewshot_train_files ?= eval/$(release)/train/annotated.txt $(wildcard $(foreach d,$($(release)_devices),$(d)/eval/train/annotated.txt))

synthetic_flags ?= \
	dialogues \
	aggregation \
	multifilters \
	notablejoin \
	projection \
	projection_with_filter \
	schema_org \
	undefined_filter \
	$(NULL)

target_pruning_size ?= 250
minibatch_size ?= 1000
target_size ?= 1
subdatasets ?= 6
subdataset_ids := $(shell seq 1 $(subdatasets))
max_turns ?= 4
max_depth ?= 8
debug_level ?= 1
subsample_thingpedia ?= 1
update_canonical_flags ?= --algorithm bert,adj,bart --paraphraser-model ./models/paraphraser-bart
synthetic_expand_factor ?= 1
quoted_paraphrase_expand_factor ?= 25
noquote_paraphrase_expand_factor ?= 1
quoted_fraction ?= 0.05

generate_flags ?= $(foreach v,$(synthetic_flags),--set-flag $(v)) --target-pruning-size $(target_pruning_size) --max-turns $(max_turns) --maxdepth $(max_depth)
custom_gen_flags ?=

auto_annotate_algorithm ?= bert,adj,bart
auto_annotate_mlm_model ?= bert-large-uncased
auto_annotate_custom_flags ?=

evalflags ?=

# configuration (should be set in config.mk)
eslint ?= node_modules/.bin/eslint

geniedir ?= node_modules/genie-toolkit
memsize ?= 8500
parallel ?= 7
genie ?= node --experimental_worker --max_old_space_size=$(memsize) $(geniedir)/dist/tool/genie.js

thingpedia_url ?= https://dev.almond.stanford.edu/thingpedia
developer_key ?= 88c03add145ad3a3aa4074ffa828be5a391625f9d4e1d0b034b445f18c595656

s3_bucket ?=
genie_k8s_project ?=
genie_k8s_owner ?=
s3_metrics_output ?=
metrics_output ?=
s3_model_dir ?=

.PRECIOUS: %/node_modules
.PHONY: all clean lint
.SECONDARY:

all: $($(release)_pkgfiles:%/package.json=build/%.zip)
	@:

build/%.zip: % %/node_modules
	mkdir -p `dirname $@`
	cd $< ; zip -x '*.tt' '*.yml' 'node_modules/.bin/*' 'icon.png' 'secrets.json' 'eval/*' 'simulation/*' 'database-map.tsv' -r $(abspath $@) .

%/node_modules: %/package.json %/package-lock.json
	mkdir -p $@
	cd `dirname $@` ; npm install --only=prod --no-optional
	touch $@

%: %/package.json %/*.js %/node_modules
	touch $@

$(schema_file): $(addsuffix /manifest.tt,$($(release)_devices))
	cat $^ > $@.tmp
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

$(dataset_file): $(addsuffix /dataset.tt,$($(release)_devices))
	cat $^ > $@.tmp
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

eval/$(release)/constants.tsv: $(schema_file) parameter-datasets.tsv
	$(genie) sample-constants -o $@.tmp \
	  --thingpedia $(schema_file) \
	  --parameter-datasets parameter-datasets.tsv
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

eval/$(release)/paraphrase.tsv : eval/everything/paraphrase.tsv
	node ./scripts/subset-multidevice.js paraphrase $(release) $(custom_devices)

eval/$(release)/%/annotated.txt : eval/everything/%/annotated.txt
	mkdir -p $(dir $@)
	node ./scripts/subset-multidevice.js $* $(release) $(custom_devices)

%/manifest.auto.tt: %/manifest.tt eval/$(release)/constants.tsv parameter-datasets.tsv .embeddings/paraphraser-bart
	$(genie) auto-annotate -o $@.tmp --thingpedia $< \
	  --dataset custom \
	  --constants eval/$(release)/constants.tsv \
	  --parameter-datasets parameter-datasets.tsv \
	  --algorithm $(auto_annotate_algorithm) \
	  --model $(auto_annotate_mlm_model) \
	  --paraphraser-model .embeddings/paraphraser-bart \
	  $(auto_annotate_custom_flags)
	mv $@.tmp $@

eval/$(release)/database-map.tsv: $(wildcard $(addsuffix /database-map.tsv,$($(release)_devices)))
	for f in $^ ; do \
	  sed 's|\t|\t../../'`dirname $$f`'/|g' $$f >> $@.tmp ; \
	done
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

entities.json:
	$(genie) download-entities --thingpedia-url $(thingpedia_url) --developer-key $(developer_key) -o $@

parameter-datasets.tsv:
	$(genie) download-entity-values --thingpedia-url $(thingpedia_url) --developer-key $(developer_key) \
	   --manifest $@.tmp --append-manifest -d parameter-datasets
	$(genie) download-string-values --thingpedia-url $(thingpedia_url) --developer-key $(developer_key) \
	   --manifest $@.tmp --append-manifest -d parameter-datasets
	mv $@.tmp $@

.embeddings/paraphraser-bart:
	mkdir -p .embeddings
	wget -c --no-verbose https://almond-static.stanford.edu/test-data/paraphraser-bart.tar.xz
	tar -C .embeddings -xvf paraphraser-bart.tar.xz

eval/$(release)/synthetic-%.txt : $(schema_file) $(dataset_file) entities.json
	if test $(subsample_thingpedia) = 1 ; then \
	  cp $(schema_file) eval/$(release)/schema-$*.tt ; \
	else \
	  $(genie) subsample-thingpedia \
	    -o eval/$(release)/schema-$*.tt \
	    --fraction $(subsample_thingpedia) \
	    --random-seed $@ \
	    $(schema_file) ; \
	fi
	$(genie) generate-dialogs \
	  --locale en-US --target-language thingtalk \
	  --thingpedia eval/$(release)/schema-$*.tt --entities entities.json --dataset $(dataset_file) \
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
	  --quoted-paraphrasing-expand-factor $(quoted_paraphrase_expand_factor) \
	  --no-quote-paraphrasing-expand-factor $(noquote_paraphrase_expand_factor) \
	  --quoted-fraction $(quoted_fraction) \
	  --debug \
	  --parallelize $(parallel) \
	  $(paraphrases_user) $<
	mv $@.tmp $@

eval/$(release)/augmented.agent.tsv : eval/$(release)/synthetic.agent.tsv $(schema_file) $(paraphrases_agent) parameter-datasets.tsv
	$(genie) augment -o $@.tmp \
	  --locale en-US \
	  --target-language thingtalk --contextual \
	  --thingpedia $(schema_file) \
	  --parameter-datasets parameter-datasets.tsv \
	  --synthetic-expand-factor $(synthetic_expand_factor) \
	  --quoted-paraphrasing-expand-factor $(quoted_paraphrase_expand_factor) \
	  --no-quote-paraphrasing-expand-factor $(noquote_paraphrase_expand_factor) \
	  --quoted-fraction $(quoted_fraction) \
	  --debug \
	  --parallelize $(parallel) \
	  $(paraphrases_agent) $<
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

eval/$(release)/train/agent.tsv : $(fewshot_train_files) $(schema_file)
	$(genie) dialog-to-contextual \
	  --locale en-US --target-language thingtalk --no-tokenized \
	  --thingpedia $(schema_file) --side agent \
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
	mkdir -p eval/$(release)/$(eval_set)/$(dir $*)
	$(genie) evaluate-server \
	  --url "file://$(abspath $(dir $<))" \
	  --thingpedia $(schema_file) -l en-US \
	  --contextual \
	  --split-by-device --complexity-metric turn_number --max-complexity 3 \
	  --debug --csv-prefix $(eval_set) --csv $(evalflags) \
	  -o $@.tmp eval/$(release)/$(eval_set)/user.tsv > eval/$(release)/$(eval_set)/$*.nlu.debug.tmp
	mv eval/$(release)/$(eval_set)/$*.nlu.debug.tmp eval/$(release)/$(eval_set)/$*.nlu.debug
	mv $@.tmp $@

datadir/agent: eval/$(release)/synthetic.agent.tsv eval/$(release)/augmented.agent.tsv eval/$(release)/dev/agent.tsv
	mkdir -p $@
	cp eval/$(release)/synthetic.agent.tsv $@/
	cp eval/$(release)/augmented.agent.tsv $@/train.tsv ; \
	cp eval/$(release)/dev/agent.tsv $@/eval.tsv ; \
	touch $@

datadir/nlg: eval/$(release)/synthetic.agent.tsv eval/$(release)/dev/agent.tsv
	mkdir -p $@
	cp eval/$(release)/synthetic.agent.tsv $@/train.tsv ; \
	cp eval/$(release)/dev/agent.tsv $@/eval.tsv ; \
	touch $@

datadir/user: eval/$(release)/synthetic.user.tsv eval/$(release)/augmented.user.tsv eval/$(release)/dev/user.tsv
	mkdir -p $@
	cp eval/$(release)/synthetic.user.tsv $@/
	cp eval/$(release)/augmented.user.tsv $@/train.tsv ; \
	cp eval/$(release)/dev/user.tsv $@/eval.tsv ; \
	touch $@

datadir/fewshot: eval/$(release)/train/user.tsv eval/$(release)/dev/user.tsv eval/$(release)/train/agent.tsv eval/$(release)/dev/agent.tsv
	mkdir -p $@/user $@/agent
	cp eval/$(release)/train/user.tsv $@/user/train.tsv
	cp eval/$(release)/dev/user.tsv $@/user/eval.tsv
	cp eval/$(release)/train/agent.tsv $@/agent/train.tsv
	cp eval/$(release)/dev/agent.tsv $@/agent/eval.tsv
	touch $@

datadir: datadir/agent datadir/nlg datadir/user datadir/fewshot $(foreach v,$(subdataset_ids),eval/$(release)/synthetic-$(v).txt)
	cat eval/$(release)/synthetic-*.txt > $@/synthetic.txt
	$(genie) measure-training-set $@ > $@/stats
	touch $@

clean:
	rm -fr build/
	rm -fr entities.json
	for exp in $(all_releases) ; do \
		rm -rf eval/$$exp/schema.tt eval/$$exp/dataset.tt eval/$$exp/synthetic* parameter-datasets* eval/$$exp/augmented* ; \
	done

lint:
	any_error=0 ; \
	for d in $($(release)_devices) ; do \
		echo $$d ; \
		$(genie) lint-device --thingpedia-url $(thingpedia_url) --manifest $$d/manifest.tt --dataset $$d/dataset.tt --thingpedia-dir main|| any_error=$$? ; \
		test ! -f $$d/package.json || $(eslint) $$d/*.js || any_error=$$? ; \
	done ; \
	exit $$any_error


evaluate: eval/$(release)/$(eval_set)/$(model).dialogue.results eval/$(release)/$(eval_set)/$(model).nlu.results
	@echo eval/$(release)/$(eval_set)/$(model).dialogue.results
	@cat eval/$(release)/$(eval_set)/$(model).dialogue.results

evaluate-output-artifacts:
	mkdir -p `dirname $(s3_metrics_output)`
	mkdir -p $(metrics_output)
	aws s3 sync eval/$(release)/$(eval_set)/ s3://$(s3_bucket)/$(genie_k8s_owner)/workdir/$(genie_k8s_project)/eval/$(release)/$(eval_set)/
	echo s3://$(s3_bucket)/$(genie_k8s_owner)/workdir/$(genie_k8s_project)/eval/$(release)/$(eval_set)/ > $(s3_metrics_output)
	cp -r eval/$(release)/$(eval_set)/* $(metrics_output)
	python3 scripts/write_ui_metrics_outputs.py eval/$(release)/$(eval_set)/$(model).dialogue.results eval/$(release)/$(eval_set)/$(model).nlu.results

eval/$(release)/models/%/best.pth:
	mkdir -p eval/$(release)/models/$(if $(findstring /,$*),$(dir $*),)
      ifeq ($(s3_model_dir),)
	  aws s3 sync --no-progress --exclude '*/dataset/*' --exclude '*/cache/*' --exclude 'iteration_*.pth' --exclude '*_optim.pth' s3://geniehai/$(if $(findstring /,$*),$(dir $*),$(genie_k8s_owner)/)models/$(genie_k8s_project)/$(release)/$(notdir $*)/ eval/$(release)/models/$*/
      else
	  aws s3 sync --no-progress --exclude '*/dataset/*' --exclude '*/cache/*' --exclude 'iteration_*.pth' --exclude '*_optim.pth' $(s3_model_dir) eval/$(release)/models/$*/
      endif
