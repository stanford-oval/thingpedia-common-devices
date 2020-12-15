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
template_file ?= thingtalk/en/dialogue.genie
dataset_file ?= eval/$(release)/dataset.tt
schema_file ?= eval/$(release)/schema.tt
paraphrases_user ?= eval/$(release)/paraphrase.tsv $(foreach d,$($(release)_devices),$(d)/eval/paraphrase.tsv)
eval_files ?= eval/$(release)/$(eval_set)/annotated.txt $(foreach d,$($(release)_devices),$(d)/eval/$(eval_set)/annotated.txt)
fewshot_train_files ?= eval/$(release)/train/annotated.txt $(foreach d,$($(release)_devices),$(d)/eval/train/annotated.txt)

synthetic_flags ?= \
	dialogues \
	aggregation \
	multifilters \
	nostream \
	notablejoin \
	projection \
	projection_with_filter \
	schema_org \
	undefined_filter \
	$(NULL)

target_pruning_size ?= 200
minibatch_size ?= 1000
target_size ?= 1
subdatasets ?= 6
subdataset_ids := $(shell seq 1 $(subdatasets))
max_turns ?= 4
max_depth ?= 8
debug_level ?= 1
subsample_thingpedia ?= 0.75
update_canonical_flags ?= --algorithm bert,adj,bart --paraphraser-model ./models/paraphraser-bart
synthetic_expand_factor ?= 3
paraphrase_expand_factor ?= 5
quoted_fraction ?= 0.05

generate_flags ?= $(foreach v,$(synthetic_flags),--set-flag $(v)) --target-pruning-size $(target_pruning_size) --max-turns $(max_turns) --maxdepth $(max_depth)
custom_gen_flags ?=

auto_annotate_algorithm ?= bert,adj,bart
auto_annotate_mlm_model ?= bert-large-uncased
auto_annotate_custom_flags ?=

template_deps = \
	$(geniedir)/languages-dist/thingtalk/*.js \
	$(geniedir)/languages-dist/thingtalk/en/*.js \
	$(geniedir)/languages-dist/thingtalk/en/dlg/*.js \
	$(geniedir)/languages-dist/thingtalk/dialogue_acts/*.js

evalflags ?=

# configuration (should be set in config.mk)
eslint ?= node_modules/.bin/eslint
thingpedia_cli ?= node_modules/.bin/thingpedia

geniedir ?= node_modules/genie-toolkit
memsize ?= 9000
parallel ?= 7
genie ?= node --experimental_worker --max_old_space_size=$(memsize) $(geniedir)/dist/tool/genie.js

thingpedia_url ?= https://almond-dev.stanford.edu/thingpedia
developer_key ?= invalid

s3_bucket ?=
genie_k8s_project ?=
genie_k8s_owner ?=
s3_metrics_output ?=
metrics_output ?=
artifacts_ver := $(shell date +%s)
s3_model_dir ?=

.PRECIOUS: %/node_modules
.PHONY: all clean lint
.SECONDARY:

all: $($(release)_pkgfiles:%/package.json=build/%.zip)
	@:

build/%.zip: % %/node_modules
	mkdir -p `dirname $@`
	cd $< ; zip -x '*.tt' '*.yml' 'node_modules/.bin/*' 'icon.png' 'secrets.json' 'eval/*' 'simulation/*' 'database-map.tsv' -r $(abspath $@) .

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

eval/$(release)/constants.tsv: $(schema_file) parameter-datasets.tsv
	$(genie) sample-constants -o $@.tmp \
	  --thingpedia $(schema_file) \
	  --parameter-datasets parameter-datasets.tsv
	if test -f $@ && cmp $@.tmp $@ ; then rm $@.tmp ; else mv $@.tmp $@ ; fi

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

.embeddings/paraphraser-bart:
	mkdir -p .embeddings
	wget -c --no-verbose https://almond-static.stanford.edu/test-data/paraphraser-bart.tar.xz
	tar -C .embeddings -xvf paraphraser-bart.tar.xz

eval/$(release)/synthetic-%.txt : $(schema_file) $(dataset_file) $(template_deps) entities.json
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
	  --template $(geniedir)/languages-dist/$(template_file) \
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
	  --quoted-paraphrasing-expand-factor $(paraphrase_expand_factor) \
	  --no-quote-paraphrasing-expand-factor $(paraphrase_expand_factor) \
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
	  --quoted-paraphrasing-expand-factor $(paraphrase_expand_factor) \
	  --no-quote-paraphrasing-expand-factor $(paraphrase_expand_factor) \
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

datadir/fewshot: eval/$(release)/train/user.tsv eval/$(release)/dev/user.tsv
	mkdir -p $@/user
	cp eval/$(release)/train/user.tsv $@/user/train.tsv
	cp eval/$(release)/dev/user.tsv $@/user/eval.tsv
	touch $@

datadir: datadir/agent datadir/nlg datadir/user datadir/fewshot $(foreach v,$(subdataset_ids),eval/$(release)/synthetic-$(v).txt)
	cat eval/$(release)/synthetic-*.txt > $@/synthetic.txt
	$(genie) measure-training-set $@ > $@/stats
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


evaluate: eval/$(release)/$(eval_set)/$(model).dialogue.results eval/$(release)/$(eval_set)/$(model).nlu.results
	@echo eval/$(release)/$(eval_set)/$(model).dialogue.results
	@cat eval/$(release)/$(eval_set)/$(model).dialogue.results

evaluate-output-artifacts:
	mkdir -p `dirname $(s3_metrics_output)`
	mkdir -p $(metrics_output)
	for f in {dialogue,nlu}.{results,debug} ; do \
	  aws s3 cp eval/$(release)/$(eval_set)/$(model).$$f s3://$(s3_bucket)/$(genie_k8s_owner)/workdir/$(genie_k8s_project)/eval/$(release)/$(eval_set)/$(if $(findstring /,$(model)),$(dir $(model)),)$(artifacts_ver)/ ; \
	done
	echo s3://$(s3_bucket)/$(genie_k8s_owner)/workdir/$(genie_k8s_project)/eval/$(release)/$(eval_set)/$(if $(findstring /,$(model)),$(dir $(model)),)$(artifacts_ver)/ > $(s3_metrics_output)
	cp -r eval/$(release)/$(eval_set)/* $(metrics_output)
	python3 scripts/write_ui_metrics_outputs.py eval/$(release)/$(eval_set)/$(model).dialogue.results eval/$(release)/$(eval_set)/$(model).nlu.results

eval/$(release)/models/%/best.pth:
	mkdir -p eval/$(release)/models/$(if $(findstring /,$*),$(dir $*),)
      ifeq ($(s3_model_dir),)
	  aws s3 sync --no-progress --exclude '*/dataset/*' --exclude '*/cache/*' --exclude 'iteration_*.pth' --exclude '*_optim.pth' s3://geniehai/$(if $(findstring /,$*),$(dir $*),$(genie_k8s_owner)/)models/$(genie_k8s_project)/$(release)/$(notdir $*)/ eval/$(release)/models/$*/
      else
	  aws s3 sync --no-progress --exclude '*/dataset/*' --exclude '*/cache/*' --exclude 'iteration_*.pth' --exclude '*_optim.pth' $(s3_model_dir) eval/$(release)/models/$*/
      endif
