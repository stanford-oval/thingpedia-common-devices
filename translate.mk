####################################################################################################################
##### Prepare dataset for translation                ###############################################################
####################################################################################################################

# source ?= user | agent | nlg | fewshot/agent | fewshot/user
source ?= user

num_columns = 4
clean_input_quotes = true


$(experiment)/$(source)/input: datadir/$(source)
	mkdir -p $@

	for f in $(all_names) ; do \
		if $(clean_input_quotes) ; then \
			python3 ./scripts/text_edit.py --no_lower_case --remove_qpis --num_columns $(num_columns) --experiment $(experiment) --input_file $</$$f.tsv --output_file $@/$$f.tsv ; \
		else \
			cp $</$$f.tsv $@/$$f.tsv ; \
		fi ; \
	done

$(experiment)/$(source)/input-qpis: $(experiment)/$(source)/input
	mkdir -p $@

	# qpis input data
	for f in $(all_names) ; do $(genie) requote --mode qpis --contextual -o $@/$$f.tsv $</$$f.tsv; done


$(experiment)/$(source)/input-nmt: $(experiment)/$(source)/input-qpis
	mkdir -p $@
	# prepare unquoted data for translation
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --no_lower_case --prepare_for_marian --replace_ids  --num_columns $(num_columns) --input_file $</$$f.tsv --output_file $@/$$f.tmp.tsv ; \
		cut -f1,3 $@/$$f.tmp.tsv >  $@/$$f.tsv ; \
	done
	rm -rf $@/*.tmp*


process_data: $(experiment)/$(source)/input-nmt
	# done!
	echo $@


####################################################################################################################
##### translate dialogs using open-source NMT models ###############################################################
####################################################################################################################

model_name_or_path=Helsinki-NLP/opus-mt-$(src_lang)-$(tgt_lang)
# model_name_or_path=facebook/mbart-large-50-many-to-many-mmt
# model_name_or_path=facebook/m2m100_418M
# model_name_or_path=facebook/m2m100_1.2B

src_lang =
tgt_lang =

return_raw_outputs = false

val_batch_size = 2000
temperature = 0.2

nmt_model = marian

train_default_args = --eval_set_name eval --override_question= --train_tasks almond_translate --train_languages $(src_lang) --train_tgt_languages $(tgt_lang) --eval_languages $(src_lang) --eval_tgt_languages $(tgt_lang) --model TransformerSeq2Seq --save $(GENIENLP_EMBEDDINGS)/$(model_name_or_path)/ --embeddings $(GENIENLP_EMBEDDINGS) --exist_ok --skip_cache --no_commit --preserve_case
translate_default_args = --translate_no_answer --tasks almond_translate --evaluate valid --pred_languages $(src_lang) --pred_tgt_languages $(tgt_lang) --path $(GENIENLP_EMBEDDINGS)/$(model_name_or_path)/ --embeddings $(GENIENLP_EMBEDDINGS) --overwrite --silent
custom_translation_hparams = --val_batch_size $(val_batch_size) --temperature $(temperature) --translate_example_split

genienlpdir ?= ../genienlp
GENIENLP_EMBEDDINGS ?= $(genienlpdir)/.embeddings
SENTENCE_TRANSFORMERS_HOME ?= $(genienlpdir)/.embeddings
GENIENLP_DATABASE_DIR ?=
genienlp ?= export SENTENCE_TRANSFORMERS_HOME=$(SENTENCE_TRANSFORMERS_HOME) ; $(shell which genienlp)

$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/translated-qpis: $(experiment)/$(source)/input-nmt/
	mkdir -p $@

	rm -rf tmp/
	mkdir -p tmp/almond/
	ln -f $</*.tsv tmp/almond/
	for f in $(all_names) ; do \
		if [ ! -f $(GENIENLP_EMBEDDINGS)/$(model_name_or_path)/best.pth ] ; then \
			$(genienlp) train --do_alignment --train_iterations 0 --pretrained_model $(model_name_or_path) $(train_default_args) ; \
		fi ; \
		$(genienlp) predict --pred_set_name $$f --do_alignment --data tmp/ `if ${return_raw_outputs} ; then echo "--translate_return_raw_outputs" ; fi` --eval_dir $@/ $(translate_default_args) $(custom_translation_hparams) || exit 1 ; \
		mv $@/valid/almond_translate.tsv $@/$$f.tsv ; \
		if [ -e "$@/valid/almond_translate.raw.tsv" ] ; then mv $@/valid/almond_translate.raw.tsv $@/$$f.raw.tsv ; fi ; \
		rm -rf $@/valid ; \
	done ; \
	rm -rf tmp/

translate_data: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/translated-qpis
	# done!
	echo $@

####################################################################################################################
##### Postprocess Translated dataset                 ###############################################################
####################################################################################################################
augment_default_args = --num-attempts 10000 --target-language thingtalk --contextual --synthetic-expand-factor $(synthetic_expand_factor) --quoted-paraphrasing-expand-factor $(quoted_paraphrase_expand_factor) --no-quote-paraphrasing-expand-factor $(noquote_paraphrase_expand_factor) --quoted-fraction $(quoted_fraction)

$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/refined-qpis: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/translated-qpis
	mkdir -p $@
	for f in $(all_names) ; do \
		paste <(cut -f1,2 ./$(experiment)/$(source)/input/$$f.tsv) <(cut -f2 $</$$f.tsv) <(cut -f4 ./$(experiment)/$(source)/input/$$f.tsv) > $@/$$f.tmp.tsv ; \
		python3 ./scripts/text_edit.py --no_lower_case --refine_sentence --post_process_translation --unnormalize_punctuation --experiment $(experiment) --param_language $(src_lang) --num_columns $(num_columns) --input_file $@/$$f.tmp.tsv --output_file $@/$$f.tsv ; \
	done
	rm -rf $@/*.tmp*


$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned-qpis: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/refined-qpis
	mkdir -p $@
	# fix punctuation and clean dataset
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --no_lower_case --e2e --insert_space_quotes --num_columns $(num_columns) --input_file $</$$f.tsv --output_file $@/$$f.tsv ; \
	done


$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned-qpis
	mkdir -p $@
	# remove quotation marks in the sentence
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --no_lower_case --remove_qpis --num_columns $(num_columns) --input_file $</$$f.tsv  --output_file $@/$$f.tsv ; \
	done


$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/quoted: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/cleaned
	mkdir -p $@
	# requote dataset (if successful, verifies parameters match in the sentence and in the program)
	for f in $(all_names) ; do \
		$(genie) requote --mode replace --contextual -o $@/$$f.tsv $</$$f.tsv  ; \
	done

# expand parameter-datasets.tsv to include locale for target language
update_param_set: parameter-datasets.tsv
	cat $< > $<.tmp
	if command -v gsed &> /dev/null ; \
	then \
		cat $< | sort | uniq | gsed -r "s|^(\w*)\ten-US|\1\t$(tgt_lang)|g" >> $<.tmp ; \
	else \
  		cat $< | sort | uniq | sed -r "s|^(\w*)\ten-US|\1\t$(tgt_lang)|g" >> $<.tmp ; \
	fi
	cat $<.tmp | sort | uniq > $<
	rm -rf $<.tmp

$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/augmented: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/quoted update_param_set $(schema_file)
	mkdir -p $@
	# augment dataset in target language
	for f in $(all_names) ; do \
		$(genie) augment -o $@/$$f.tsv --override-flags S --param-locale $(tgt_lang) -l en-US \
		 		--thingpedia $(schema_file) --parameter-datasets parameter-datasets.tsv $(augment_default_args) $</$$f.tsv ; \
	done


$(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/final: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/augmented
	mkdir -p $@
	# remove cjk spaces and lowercase text
	for f in $(all_names) ; do \
		python3 ./scripts/text_edit.py --fix_spaces_cjk --experiment $(experiment) --param_language $(tgt_lang) --num_columns $(num_columns) --input_file $</$$f.tsv --output_file $@/$$f.tsv  ; \
	done

postprocess_data: $(experiment)/$(source)/$(nmt_model)/$(tgt_lang)/final
	# done!
	echo $@
