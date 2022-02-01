####################################################################################################################
##### Prepare dataset for translation                ###############################################################
####################################################################################################################

# source ?= user | agent | nlg | fewshot/agent | fewshot/user
source ?= user

translate_num_columns = 4
clean_input_quotes = true
requote_skip_errors =


eval/$(experiment)/$(source)/input: datadir/$(source)
	mkdir -p $@

	for f in $(all_names) ; do \
		if $(clean_input_quotes) ; then \
			python3 ./scripts/text_edit.py --no_lower_case --remove_qpis --num_columns $(translate_num_columns) --experiment $(experiment) --input_file $</$$f.tsv --output_file $@/$$f.tsv ; \
		else \
			cp $</$$f.tsv $@/$$f.tsv ; \
		fi ; \
	done

eval/$(experiment)/$(source)/input-qpis: eval/$(experiment)/$(source)/input
	mkdir -p $@

	# qpis input data
	for f in $(all_names) ; do $(genie) requote --mode qpis --contextual $(if $(requote_skip_errors),--skip-errors --output-errors $@/$$f.tsv,) -o $@/$$f.tsv $</$$f.tsv; done


eval/$(experiment)/$(source)/input-nmt: eval/$(experiment)/$(source)/input-qpis
	mkdir -p $@
	# prepare unquoted data for translation
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --no_lower_case --prepare_for_marian --replace_ids  --num_columns $(translate_num_columns) --input_file $</$$f.tsv --output_file $@/$$f.tmp.tsv ; \
		cut -f1,3 $@/$$f.tmp.tsv >  $@/$$f.tsv ; \
	done
	rm -rf $@/*.tmp*


process_data: eval/$(experiment)/$(source)/input-nmt
	# done!
	echo $@


####################################################################################################################
##### translate dialogs using open-source NMT models ###############################################################
####################################################################################################################

model_name_or_path = Helsinki-NLP/opus-mt-$(src_lang)-$(tgt_lang)
# model_name_or_path=facebook/mbart-large-50-many-to-many-mmt
# model_name_or_path=facebook/m2m100_418M
# model_name_or_path=facebook/m2m100_1.2B

src_lang =
tgt_lang =

return_raw_outputs = true

val_batch_size = 2000
temperature = 0.2

nmt_model = marian
skip_translation = false

translate_fixed_default_args = --eval_set_name eval --override_question= --train_tasks almond_translate --train_languages $(src_lang) --train_tgt_languages $(tgt_lang) --eval_languages $(src_lang) --eval_tgt_languages $(tgt_lang) --model TransformerSeq2Seq --save $(GENIENLP_EMBEDDINGS)/$(model_name_or_path)/ --embeddings $(GENIENLP_EMBEDDINGS) --exist_ok --skip_cache --no_commit --preserve_case
translate_pred_default_args = --translate_example_split --translate_no_answer --tasks almond_translate --evaluate valid --pred_languages $(src_lang) --pred_tgt_languages $(tgt_lang) --path $(GENIENLP_EMBEDDINGS)/$(model_name_or_path)/ --embeddings $(GENIENLP_EMBEDDINGS) --overwrite --silent
custom_translation_hparams = --val_batch_size $(val_batch_size) --temperature $(temperature)

genienlpdir ?= ../genienlp
GENIENLP_EMBEDDINGS ?= $(genienlpdir)/.embeddings
SENTENCE_TRANSFORMERS_HOME ?= $(genienlpdir)/.embeddings
GENIENLP_DATABASE_DIR ?=
genienlp ?= GENIENLP_EMBEDDINGS=$(GENIENLP_EMBEDDINGS) ; SENTENCE_TRANSFORMERS_HOME=$(SENTENCE_TRANSFORMERS_HOME) ; genienlp


do_translate:
	rm -rf tmp/
	mkdir -p tmp/almond/
	ln -f $(input_folder)/*.tsv tmp/almond/
	if ! $(skip_translation) ; then \
		if [ ! -f $(GENIENLP_EMBEDDINGS)/$(model_name_or_path)/best.pth ] ; then \
			$(genienlp) train --train_iterations 0 --pretrained_model $(model_name_or_path) $(train_default_args) ; \
		fi ; \
		for f in $(all_names) ; do \
			$(genienlp) predict --pred_set_name $$f --data tmp/ --do_alignment $(if $(return_raw_outputs), --translate_return_raw_outputs, ) --eval_dir $(output_folder)/ $(translate_pred_default_args) $(custom_translation_hparams) || exit 1 ; \
			mv $(output_folder)/valid/almond_translate.tsv $(output_folder)/$$f.tsv ; \
			if [ -e "$(output_folder)/valid/almond_translate.raw.tsv" ] ; then mv $(output_folder)/valid/almond_translate.raw.tsv $(output_folder)/$$f.raw.tsv ; fi ; \
			rm -rf $(output_folder)/valid ; \
		done ; \
	fi
	rm -rf tmp/


eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/translated-qpis: eval/$(experiment)/$(source)/input-nmt/
	mkdir -p $@
	make input_folder="$<" output_folder="$@" do_translate

translate_data: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/translated-qpis
	# done!
	echo $@


translate_params: parameter-datasets.tsv
#	rm -rf tmp-param/$(src_lang)
#	mkdir -p tmp-param/$(src_lang)
#	for file in parameter-datasets/$(src_lang)/* ; do \
#		python3 ./scripts/process_param_set.py --task prepare_input --input_file parameter-datasets/$(src_lang)/$${file##*/} --output_file tmp-param/$(src_lang)/$${file##*/} ; \
#	done


	for file in tmp-param/$(src_lang)/* ; do \
		echo $${file##*/} >> tmp-param/all-names.tsv ; \
		wc -l < $$file | sed 's/ //g' >> tmp-param/all-numbers.tsv ; \
		cat $$file >> tmp-param/all.tsv ; \
	done

	make all_names="all" input_folder="tmp-param/$(src_lang)/" output_folder="tmp-param/$(tgt_lang)/" do_translate

#	rm -rf tmp-param/$(src_lang)


shame:
	file=parameter-datasets/en/dasda/com.wyt-yelp:restaurant.json ; \
	echo $${file##*/} ; \
	echo $(patsubst %.json,%.tsv,$${file##*/}) ; \
	echo $(addsuffix .tsv,$(basename $${file##*/})) ; \

####################################################################################################################
##### Postprocess Translated dataset                 ###############################################################
####################################################################################################################
augment_default_args = --num-attempts 10000 --target-language thingtalk --contextual --synthetic-expand-factor $(synthetic_expand_factor) --quoted-paraphrasing-expand-factor $(quoted_paraphrase_expand_factor) --no-quote-paraphrasing-expand-factor $(noquote_paraphrase_expand_factor) --quoted-fraction $(quoted_fraction)
augment_override_flags = S

eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/refined-qpis: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/translated-qpis
	mkdir -p $@
	for f in $(all_names) ; do \
		paste <(cut -f1,2 ./eval/$(experiment)/$(source)/input/$$f.tsv) <(cut -f2 $</$$f.tsv) <(cut -f4 ./eval/$(experiment)/$(source)/input/$$f.tsv) > $@/$$f.tmp.tsv ; \
		python3 ./scripts/text_edit.py --no_lower_case --refine_sentence --post_process_translation --experiment $(experiment) --param_language $(src_lang) --num_columns $(translate_num_columns) --input_file $@/$$f.tmp.tsv --output_file $@/$$f.tsv ; \
	done
	rm -rf $@/*.tmp*


eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned-qpis: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/refined-qpis
	mkdir -p $@
	# fix punctuation and clean dataset
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --no_lower_case --insert_space_quotes --num_columns $(translate_num_columns) --input_file $</$$f.tsv --output_file $@/$$f.tsv ; \
	done


eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned-qpis
	mkdir -p $@
	# remove quotation marks in the sentence
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --no_lower_case --remove_qpis --num_columns $(translate_num_columns) --input_file $</$$f.tsv  --output_file $@/$$f.tsv ; \
	done


eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/quoted: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned
	mkdir -p $@
	# requote dataset (if successful, verifies parameters match in the sentence and in the program)
	for f in $(all_names) ; do \
		$(genie) requote --mode replace --contextual $(if $(requote_skip_errors),--skip-errors --output-errors $@/$$f.tsv,) -o $@/$$f.tsv $</$$f.tsv  ; \
	done

# expand parameter-datasets.tsv to include locale for target language
#update_param_set: parameter-datasets.tsv
#	cat $< > $<.tmp
#	cat $< | sort | uniq | $(if $(shell command -v gsed), gsed, sed) -r "s|^(\w*)\ten-US|\1\t$(tgt_lang)|g" >> $<.tmp ; \
#	cat $<.tmp | sort | uniq > $<
#	rm -rf $<.tmp

update_param_set: parameter-datasets.tsv
	cat $< | sort | uniq > $<.tmp
	cat $< | sort | uniq | $(if $(shell command -v gsed), gsed, sed) -r "s|\tparameter-datasets/|\tparameter-datasets/$(tgt_lang)/|g" | $(if $(shell command -v gsed), gsed, sed) -r "s|^(\w*)\ten-US|\1\t$(tgt_lang)|g" >> $<.tmp ; \
	mv $<.tmp $<

eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/augmented: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/quoted update_param_set $(schema_file)
	mkdir -p $@
	# augment dataset in target language
	for f in $(all_names) ; do \
		$(genie) augment -o $@/$$f.tsv $(if $(augment_override_flags) --override-flags $(augment_override_flags),) --param-locale $(tgt_lang) -l en-US \
		 		--thingpedia $(schema_file) --parameter-datasets parameter-datasets.tsv $(augment_default_args) $</$$f.tsv ; \
	done


eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/final: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/augmented
	mkdir -p $@
	# remove cjk spaces and lowercase text
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --fix_spaces_cjk --experiment $(experiment) --param_language $(tgt_lang) --num_columns $(translate_num_columns) --input_file $</$$f.tsv --output_file $@/$$f.tsv  ; \
	done

postprocess_data: eval/$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/final
	# done!
	echo $@
