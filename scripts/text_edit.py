# Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
#
# Author: Mehrad Moradshahi <mehrad@cs.stanford.edu>
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
# * Redistributions of source code must retain the above copyright notice, this
#  list of conditions and the following disclaimer.
#
# * Redistributions in binary form must reproduce the above copyright notice,
#  this list of conditions and the following disclaimer in the documentation
#  and/or other materials provided with the distribution.
#
# * Neither the name of the copyright holder nor the names of its
#  contributors may be used to endorse or promote products derived from
#  this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
# FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
# DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
# SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
# OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


## Replica of stanford-oval/genie-wrokdirs/spl/scripts/text_edit.py

import argparse
import json
import os
import re
import unicodedata
from collections import defaultdict

import numpy as np
from tqdm import tqdm

try:
    from BiToD.knowledgebase.en_zh_mappings import *
    from BiToD.knowledgebase.en_fa_mappings import *
except ImportError:
    pass

from genienlp.data_utils.almond_utils import detokenize_cjk_chars, is_cjk_char


punctuation_string = "?!.\u060c\u061F"
quoted_pattern_maybe_space = re.compile(r'\"\s?([^"]*?)\s?\"')
english_regex = re.compile(r"([a-zA-Z\-][a-zA-Z_\-'s\.:]*[_0-9]?||\b[a-z0-9]*\b|\d+|'s)")
english_person_names = re.compile(r"\b(\w+\s\w(?!\s\.))\b")

quoted_pattern_no_space = re.compile(r'\"([^"]*?)\"')
quoted_pattern_with_space = re.compile(r'\"\s([^"]*?)\s\"')
quoted_number_pattern = re.compile(r'\"\s(\d{1,2})\s\"')
duration_date_time_number_pattern = re.compile(r'(DURATION_\d|DATE_\d|TIME_\d|NUMBER_\d)', re.IGNORECASE)
# duration_or_date_pattern_lowercase = re.compile(r'duration_\d|date_\d')
multiple_space_pattern = re.compile(r'\s{2,}')

entity_pattern = re.compile(r'([A-Z][A-Z_]*_[0-9]+|GENERIC_ENTITY_[a-zA-Z\.:\d]+)')
only_generic_entity_pattern = re.compile(r'(GENERIC_ENTITY_[a-zA-Z\.:\d]+)')
id_number_pattern = re.compile(r'([0-9]+)')
number_pattern = re.compile(r'\b([0-9]+)\b')
small_number_pattern = re.compile(r'\b([0-9])\b')

quoted_pattern_maybe_space_or_number = re.compile(r'\"\s?([^"]*?)\s?\"|(?<!\[\s)([0-9]+)')

history_re = re.compile('<history> (.*?)(?:$|<)')
user_re = re.compile('(?:USER|USER_ACTS): (.*?)(?:$|<)')

parser = argparse.ArgumentParser()

parser.add_argument('--input_file', type=str, help='input file to read from')
parser.add_argument('--ref_file', type=str, help='reference file to read from; used to read ids from')
parser.add_argument('--id_file', type=str, help='only keep sentences that their ids is in this file ')
parser.add_argument('--output_file', type=str, help='output file to write translations to')
parser.add_argument('-n', '--num_lines', default=-1, type=int,
                    help='maximum number of lines to translate (-1 to translate all)')
parser.add_argument('--input_delimiter', default='\t', type=str, help='delimiter used to split input files')
parser.add_argument('--remove_qpis', action='store_true', help='')
parser.add_argument('--prepare_for_gt', action='store_true', help='')
parser.add_argument('--prepare_for_marian', action='store_true', help='')
parser.add_argument('--prepare_template_for_marian', action='store_true', help='')
parser.add_argument('--prepare_multiwoz_for_marian', action='store_true', help='')
parser.add_argument('--post_process_translation', action='store_true', help='')
parser.add_argument('--match_ids', action='store_true', help='')
parser.add_argument('--remove_duplicate_sents', action='store_true', help='')
parser.add_argument('--reduce_duplicate_progs', action='store_true', help='')
parser.add_argument('--sents_to_keep', type=int, default=1, help='')
parser.add_argument('--add_token', default='T', help='prepend ids with this token after matching ids')
parser.add_argument('--replace_ids', action='store_true', help='replace dataset ids with sequential unique values')
parser.add_argument('--translate_slot_names', action='store_true', help='translate_slot_names')
parser.add_argument('--translate_slot_values', action='store_true', help='translate_slot_values')
parser.add_argument('--remove_qpip_numbers', action='store_true',
                    help='remove quotation marks around numbers in program')
parser.add_argument('--delexicalize', action='store_true')
parser.add_argument('--lexicalize', action='store_true')
parser.add_argument('--insert_space_quotes', action='store_true',
                    help='insert space between quotation marks and parameters if removed during translation')
parser.add_argument('--refine_sentence', action='store_true', help='')
parser.add_argument('--arabic2english_digits', action='store_true', help='')
parser.add_argument('--fix_punctuation', action='store_true', help='')
parser.add_argument('--unnormalize_punctuation', action='store_true', help='')
parser.add_argument('--param_language', default='en')
parser.add_argument('--src_lang', default='en')
parser.add_argument('--tgt_lang', default='en')
parser.add_argument('--num_columns', type=int, default=3, help='number of columns in input file')
parser.add_argument('--process_oht', action='store_true', help='')
parser.add_argument('--compute_complexity', action='store_true', help='')
parser.add_argument('--remove_qspace', action='store_true', help='')
parser.add_argument('--preprocess_paraphrased', action='store_true', help='')
parser.add_argument('--no_lower_case', action='store_true', help='do not lower case tokens')
parser.add_argument('--no_unicode_normalize', action='store_true', help='do not unicode normalize examples')
parser.add_argument('--remove_spaces_cjk', action='store_true', help='')
parser.add_argument('--fix_spaces_cjk', action='store_true', help='')
parser.add_argument('--filter_examples', action='store_true', help='')
parser.add_argument('--experiment', type=str, help='')
parser.add_argument('--nlg', action='store_true', help='')
parser.add_argument('--e2e', action='store_true', help='')
parser.add_argument('--dst', action='store_true', help='')

args = parser.parse_args()

Ar2En_digit_map = {'۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'}


def capitalize(match):
    if isinstance(match, str):
        word = match
    else:
        word = match.group(0)
    return word[0].upper() + word[1:].lower()


def upper(match):
    word = match.group(0)
    return word.upper()


def backward_entity_mapping(entity):
    if entity.startswith('GENERIC_ENTITY'):

        try:
            base, name = entity.rsplit(':', 1)

            base = base.lower()
            base = re.sub(r'restaurant', capitalize, base)
            base = re.sub(r'hotel', capitalize, base)

            base = re.sub(r'generic_entity', upper, base)

            name = capitalize(name)

            if name.startswith('Us_state'):
                name = name.lower()

            if name.startswith('Locationfeaturespecification'):
                name = 'LocationFeatureSpecification' + name[len('Locationfeaturespecification'):]

            entity = base + ':' + name
        except Exception:
            return entity

    return entity


def forward_entity_mapping(entity):
    return entity.upper()


def parse_nlg_input(input):
    slots, values = [], []
    input_parts = input.split(' = ')
    slots.append(input_parts[0])
    for substr in input_parts[1:]:
        first_quote = substr.find('"')
        assert first_quote != -1
        end = substr.find('"', first_quote + 1) + 1
        assert end != 0, 'Mismatched quotes!'
        entity = substr[first_quote + 1:end - 2].strip()
        values.append(str(entity))
        if substr[end:].strip():
            slots.append(substr[end:].strip())
    return slots, values


lex_slot_filters = ['HKMTR offer shortest_path']

def delexicalize(_id, sent, prog, count):
    slots, values = parse_nlg_input(prog)
    slots, values = list(zip(*sorted(zip(slots, values), key=lambda item: len(item[1]), reverse=True)))
    for slot, value in zip(slots, values):
        if not value or (slot not in lex_slot_filters and not any(string in slot for string in ['number', 'rating', 'time', 'date', 'available_options'])):
            continue
        sent = sent.replace(value, '[ ' + slot + ' ]', 1)
    return _id, sent, prog


def lexicalize(_id, sent, prog, count):
    slots, values = parse_nlg_input(prog)
    slots, values = list(zip(*sorted(zip(slots, values), key=lambda item: len(item[1]), reverse=True)))
    for slot, value in zip(slots, values):
        if not value or (slot not in lex_slot_filters and not any(string in slot for string in ['number', 'rating', 'time', 'date', 'available_options'])):
            continue
        if '[ ' + slot + ' ]' not in sent:
            print(f'{count}: "{slot}" not present in "{sent}"')
        sent = sent.replace('[ ' + slot + ' ]', value, 1)
    return _id, sent, prog


def post_process_translation(_id, target_sent, prog):
    # remove extra quotation marks google translate adds
    # if target_sent[0] == '"':
    #     target_sent = target_sent[1:]
    # if target_sent[-1] == '"':
    #     target_sent = target_sent[:-1]

    # normalize all double quote symbols
    # for token in ['&quot;', '""', '“', '”', '‘', '’', '「"', '"」', '「', '」']:
    #     target_sent = target_sent.replace(token, '"')

    # target_sent = target_sent.replace('»', '')
    # target_sent = target_sent.replace('«', '')
    target_sent = target_sent.strip()

    # in rare cases google translate drops quotes at the end of the sentence
    # if target_sent.count('"') % 2 != 0:
    #     target_sent = target_sent + '"'

    # insert space before punctuation if not already there
    if target_sent and target_sent[-1] in punctuation_string and target_sent[-2] != ' ':
        target_sent = target_sent[:-1] + ' ' + target_sent[-1]

    # insert space between quotation marks and their enclosed param value
    target_sent = re.sub(quoted_pattern_maybe_space, r'" \1 "', target_sent)

    # ' s --> 's
    target_sent = target_sent.replace("' s", "'s")

    # if english params are concatenated with non english characters (e.g. Chinese) split them
    # this can cause problems when the parameter is mixed language (e.g. "爸爸Kevin’s美式BBQ")
    # thus during augmentation we only accept parameters that are not mixed

    # also split entities and english tokens if concatenated

    # if any([lang in args.param_language for lang in ['zh', 'ko', 'ja']]):
    #
    #     new_target_sent = []
    #     for token in target_sent.split(' '):
    #         if len(filter('', english_regex.findall(token))):
    #             splitted_tokens = [w for w in english_regex.split(token) if w != '']
    #             new_target_sent.extend(splitted_tokens)
    #         elif len(entity_pattern.findall(token)):
    #             splitted_tokens = [w for w in entity_pattern.split(token) if w != '']
    #             new_target_sent.extend(splitted_tokens)
    #         else:
    #             new_target_sent.append(token)
    #
    #     target_sent = ' '.join(new_target_sent)
    #
    #     target_sent = target_sent

    # if args.param_language in ['zh', 'ja', 'ko'] and args.unnormalize_punctuation:
    #     def unnormalize_punctuation(text):
    #         text = text.replace(',', '，')
    #         text = text.replace('?', '？')
    #         return text

    # target_sent = re.sub(quoted_pattern_maybe_space, lambda m: unnormalize_punctuation(m.group()), target_sent)

    if not args.no_lower_case:
        # lower case sentences unconditionally except for entities with backward_entity_mapping
        tokens = target_sent.split(' ')
        new_sent = []
        for token in tokens:
            if token == ' ':
                continue
            if entity_pattern.findall(token):
                for w in english_regex.split(token):
                    if w == '':
                        continue
                    elif entity_pattern.findall(w):
                        w = backward_entity_mapping(w)
                        new_sent.append(w)
                    else:
                        new_sent.append(w.lower())
            else:
                new_sent.append(token.lower())
        target_sent = ' '.join(new_sent)

    return _id, target_sent, prog


def get_parts(line):
    parts = tuple(map(lambda text: text.strip(), re.split(args.input_delimiter, line.strip())))
    return parts


def reduce_duplicate_progs(lines, f_out, num_columns):
    prog2id_sent = defaultdict(list)

    orig_size = 0
    for line in lines:
        if num_columns == 3:
            _id, sent, prog = get_parts(line)
        elif num_columns == 4:
            _id, context, sent, prog = get_parts(line)
        else:
            raise ValueError('Adjust num_columns')
        prog2id_sent[prog].append((_id, context, sent) if num_columns == 4 else (_id, sent))
        orig_size += 1

    new_size = 0
    for prog, id_sent_list in prog2id_sent.items():
        if len(id_sent_list) <= args.sents_to_keep:
            selected_list = id_sent_list
        else:
            rand_indices = np.random.choice(list(range(len(id_sent_list))), args.sents_to_keep, replace=False).tolist()
            selected_list = [id_sent_list[i] for i in rand_indices]
        for out in selected_list:
            f_out.write('\t'.join([*out, prog]) + '\n')
            new_size += 1

    print('The dataset size has been reduced from {} to {}'.format(orig_size, new_size))
    f_out.close()


def remove_duplicate_sents(lines, f_out, num_columns):
    _ids, contexts, sents, progs = [], [], [], []
    for line in lines:
        if num_columns == 3:
            _id, sent, prog = get_parts(line)
        elif num_columns == 4:
            _id, context, sent, prog = get_parts(line)
        else:
            raise ValueError('Adjust num_columns')
        _ids.append(_id)
        sents.append(sent)
        progs.append(prog)
        if num_columns == 4:
            contexts.append(context)

    orig_size = len(sents)

    if num_columns == 3:
        val_sets = set(sents)
    else:
        val_sets = set(list(zip(contexts, sents)))
    new_size = 0
    if num_columns == 3:
        for _id, sent, prog in zip(_ids, sents, progs):
            if sent in val_sets:
                f_out.write('\t'.join([_id, sent, prog]) + '\n')
                val_sets.remove(sent)
                new_size += 1
    else:
        for _id, context, sent, prog in zip(_ids, contexts, sents, progs):
            if (context, sent) in val_sets:
                f_out.write('\t'.join([_id, context, sent, prog]) + '\n')
                val_sets.remove((context, sent))
                new_size += 1

    print('The dataset size has been reduced from {} to {}'.format(orig_size, new_size))
    f_out.close()


def compute_complexity(_id, sent, prog):
    params = 0
    joins = 0
    inString = False
    for token in prog.split(' '):
        if token == '"':
            inString = not inString
        if inString:
            continue
        if token.startswith('param:') and not token.startswith('param:distance'):
            params += 1
        elif token == 'join':
            joins += 1
    print(params + joins)
    return _id, sent, prog


def replace_ids(_id, sent, prog, count):
    return str(count + 1), sent, prog


if args.translate_slot_values:
    lang = args.param_language
    experiment = args.experiment

    if experiment == 'multiwoz':
        pass
    elif experiment == 'risawoz':
        ont_dir = '/Users/Mehrad/Documents/GitHub/RiSAWOZ/RiSAWOZ-data/RiSAWOZ-Database-and-Ontology/Ontology'

        src_ont = json.load(open(ont_dir + '/zh/ontology.json'))
        tgt_ont = json.load(open(ont_dir + f'/{lang}/ontology.json'))

        src_all_values = ()
        tgt_all_values = ()

        for dom in src_ont.keys():
            src_slot_values = src_ont[dom]
            tgt_slot_values = tgt_ont[dom]
            for slot in src_slot_values.keys():
                src_values = src_slot_values[slot]
                tgt_values = tgt_slot_values[slot]

                assert len(src_values) == len(tgt_values), slot

                src_all_values += tuple(src_values)
                tgt_all_values += tuple(tgt_values)

    assert len(src_all_values) == len(tgt_all_values)


def translate_slot_values(_id, context, sent, prog):
    for ec, tc in zip(src_all_values, tgt_all_values):
        context = context.replace(str(ec), str(tc))
        prog = prog.replace(str(ec), str(tc))

    return _id, context, sent, prog


if args.translate_slot_names:
    lang = args.param_language
    experiment = args.experiment

    if experiment == 'multiwoz':
        src_domains, tgt_domains = MULTIWOZ_DOMAINS['en'], MULTIWOZ_DOMAINS[lang]
        src_slots, tgt_slots = MULTIWOZ_SLOTS['en'], MULTIWOZ_SLOTS[lang]

    elif experiment == 'risawoz':
        src_domains, tgt_domains = RISAWOZ_DOMAINS['zh'], RISAWOZ_DOMAINS[lang]
        src_slots, tgt_slots = RISAWOZ_SLOTS['zh'], RISAWOZ_SLOTS[lang]

    elif experiment == 'sgd' and args.nlg:
        src_domains, tgt_domains = SGD_DOMAINS['en'], SGD_DOMAINS[lang]
        src_intents, tgt_intents = SGD_INTENTS['en'], SGD_INTENTS[lang]
        src_special_intents, tgt_special_intents = SGD_SPECIAL_INTENTS['en'], SGD_SPECIAL_INTENTS[lang]
        src_slots, tgt_slots = SGD_SLOTS['en'], SGD_SLOTS[lang]

    elif experiment == 'sgd_1' and args.nlg:
        src_domains, tgt_domains = SGD_1_DOMAINS['en'], SGD_1_DOMAINS[lang]
        src_intents, tgt_intents = SGD_1_INTENTS['en'], SGD_1_INTENTS[lang]
        src_special_intents, tgt_special_intents = SGD_1_SPECIAL_INTENTS['en'], SGD_1_SPECIAL_INTENTS[lang]
        src_slots, tgt_slots = SGD_SLOTS['en'], SGD_SLOTS[lang]

    elif experiment == 'bitod_en' and args.nlg:
        lang = 'zh'
        src_domains, tgt_domains = BiTOD_EN_DOMAINS['en'], BiTOD_EN_DOMAINS[lang]
        src_intents, tgt_intents = BiTOD_EN_INTENTS['en'], BiTOD_EN_INTENTS[lang]
        src_special_intents, tgt_special_intents = (), ()
        src_slots, tgt_slots = BiTOD_EN_SLOTS['en'], BiTOD_EN_SLOTS[lang]

    elif experiment == 'bitod_zh' and args.nlg:
        # src_domains, tgt_domains = BiTOD_ZH_DOMAINS['zh'], BiTOD_ZH_DOMAINS[lang]
        # src_intents, tgt_intents = BiTOD_ZH_INTENTS['zh'], BiTOD_ZH_INTENTS[lang]
        # src_special_intents, tgt_special_intents = (), ()
        # src_slots, tgt_slots = BiTOD_ZH_SLOTS['zh'], BiTOD_ZH_SLOTS[lang]
        src_domains, tgt_domains = BiTOD_EN_DOMAINS['zh'], BiTOD_EN_DOMAINS[lang]
        src_intents, tgt_intents = BiTOD_EN_INTENTS['zh'], BiTOD_EN_INTENTS[lang]
        src_special_intents, tgt_special_intents = (), ()
        src_slots, tgt_slots = BiTOD_EN_SLOTS['zh'], BiTOD_EN_SLOTS[lang]

    elif 'bitod_en' in experiment and args.e2e:

        if args.param_language == 'en':
            merged = None

        if args.param_language == 'fa':
            merged = {**en2fa_SLOT_MAP, **en2fa_RELATION_MAP, **en2fa_INTENT_MAP, **en2fa_ACT_MAP, **en2fa_DOMAIN_MAP, **en2fa_SPECIAL_MAP}
            merged = dict(sorted(merged.items(), key=lambda item: len(item[0]), reverse=True))


    elif 'bitod_zh' in experiment and args.e2e:
        if args.param_language == 'en':
            merged = {**zh2en_SLOT_MAP, **zh2en_RELATION_MAP, **zh2en_INTENT_MAP, **zh2en_ACT_MAP **zh2en_API_MAP, **zh2en_SPECIAL_MAP, **en_API_MAP}
            merged = dict(sorted(merged.items(), key=lambda item: len(item[0]), reverse=True))

        # src_domains, tgt_domains = BiTOD_ZH_DOMAINS['zh'], BiTOD_ZH_DOMAINS[lang]
        # src_intents, tgt_intents = BiTOD_ZH_INTENTS['zh'], BiTOD_ZH_INTENTS[lang]
        # src_special_intents, tgt_special_intents = (), ()
        # src_slots, tgt_slots = BiTOD_ZH_SLOTS['zh'], BiTOD_ZH_SLOTS[lang]
        # src_domains, tgt_domains = BiTOD_EN_DOMAINS['zh'], BiTOD_EN_DOMAINS[lang]
        # src_intents, tgt_intents = BiTOD_EN_INTENTS['zh'], BiTOD_EN_INTENTS[lang]
        # src_special_intents, tgt_special_intents = (), ()
        # src_slots, tgt_slots = BiTOD_EN_SLOTS['zh'], BiTOD_EN_SLOTS[lang]

    if args.e2e:
        pass
    elif args.nlg:
        src_comb = [d.strip() + ' ' + i.strip() + ' ' + s.strip() for d in src_domains for i in src_intents for s in src_slots]
        tgt_comb = [d.strip() + ' ' + i.strip() + ' ' + s.strip() for d in tgt_domains for i in tgt_intents for s in tgt_slots]
        src_comb.extend([d.strip() + ' ' + i.strip() for d in src_domains for i in src_special_intents])
        tgt_comb.extend([d.strip() + ' ' + i.strip() for d in tgt_domains for i in tgt_special_intents])
        src_comb_set = set(src_comb)
        tgt_comb_set = set(tgt_comb)
        assert len(src_comb) == len(tgt_comb)
        assert len(src_comb_set) == len(tgt_comb_set)
    else:
        src_comb = [d.strip() + ' ' + s.strip() for d in src_domains for s in src_slots]
        tgt_comb = [d.strip() + ' ' + s.strip() for d in tgt_domains for s in tgt_slots]
        assert len(src_comb) == len(tgt_comb)


def translate_slot_names(_id, context, sent, prog):
    if args.e2e:
        # old slow implementation
        # fix later
        # for mapping in ['zh2en_INTENT_MAP', 'zh2en_API_MAP', 'zh2en_ACT_MAP', 'zh2en_RELATION_MAP', 'zh2en_SLOT_MAP']:
        #     for key, val in eval(mapping).items():
        #         sent = sent.replace(key, val)
        #         prog = prog.replace(key, val)

        if merged:
            for key, val in merged.items():
                sent = sent.replace(key, val)
                prog = prog.replace(key, val)

        # if 'bitod_zh' in experiment and args.e2e:
        #     for val in zh2en_API_MAP.values():
        #         new_val = val.replace('zh_CN', 'en_US')
        #         new_val = new_val.replace('zh', 'en')
        #         new_val = en_API_MAP[new_val]
        #         sent = sent.replace(val, new_val)
        #         prog = prog.replace(val, new_val)
        #
        # if 'bitod_en' in experiment and args.e2e:
        #     for val in fa2en_API_MAP.values():
        #         new_val = val.replace('fa_XX', 'en_US')
        #         new_val = new_val.replace('fa', 'en')
        #         new_val = en_API_MAP[new_val]
        #         sent = sent.replace(val, new_val)
        #         prog = prog.replace(val, new_val)

    elif args.nlg:
        ## old slow implementation
        # for ec, tc in zip(src_comb, tgt_comb):
        #     prog = prog.replace(ec, tc)
        agent_parsed = [x.strip() for x in prog.split('=')]
        keys = [agent_parsed[0]]
        for substr in agent_parsed[1:]:
            first_quote = substr.find('"')
            if first_quote != -1:
                end = substr.find('"', first_quote + 1) + 1
                assert end != -1, 'Mismatched quotes!'
                k = substr[end:].strip()
                if k:
                    keys.append(k)
        for key in keys:
            if key in src_comb_set:
                index = src_comb.index(key)
                prog = prog.replace(src_comb[index], tgt_comb[index])
    else:
        for ec, tc in zip(src_comb, tgt_comb):
            context = context.replace(ec, tc)
            prog = prog.replace(ec, tc)

    return _id, context, sent, prog


def fix_punctuation(_id, sent, prog):
    # insert space before punctuation if not already
    if sent[-1] in punctuation_string and sent[-2] != ' ':
        sent = sent[:-1] + ' ' + sent[-1]

    return _id, sent, prog


def preprocess_paraphrased(_id, sent, prog):
    if _id[0] != 'A':
        return _id, sent, prog

    # index = sent.find('-')
    # if index != -1:
    #     sent = sent[:index] + ' - ' + sent[index + len('-'):]

    sent = re.sub(r'(\w)-(\w*?ed|page)', r'\1 -\2', sent)

    sent = re.sub(r'\'(\w)', r'\1', sent)

    # remove apostrophe if at the end of a token
    # sent = sent.replace("' ", " ")
    sent = re.sub(r'(\w)[\';] ', r'\1 ', sent)


    # remove apostrophe if at the end of a token
    # sent = sent.replace("; ", " ")

    return _id, sent, prog


def arabic2english_digits(_id, sent, prog):
    for k, v in Ar2En_digit_map.items():
        sent = sent.replace(k, v)
    for k, v in Ar2En_digit_map.items():
        prog = prog.replace(k, v)
    return _id, sent, prog


def match_ids(_id, sent, prog, new_id):
    new_id = args.add_token + new_id
    return new_id, sent, prog


def refine_sentence(_id, context, sent, prog):
    # normalize cjk punctutation
    sent = sent.replace('：', ':')
    sent = sent.replace('，', ',')
    sent = sent.replace('？', '?')
    sent = sent.replace('！', '!')

    prog = prog.replace('：', ':')
    prog = prog.replace('，', ',')
    prog = prog.replace('？', '?')
    prog = prog.replace('！', '!')

    schema_pattern_1 = re.compile(r'GENERIC_ENTITY_ORG\.SCHEMA\.HOTEL:(.*?)LOCATIONFEATURESPECIFICATION')
    sent = re.sub(schema_pattern_1, r"\1 GENERIC_ENTITY_ORG.SCHEMA.HOTEL:LOCATIONFEATURESPECIFICATION", sent)

    schema_pattern_2 = re.compile(r'GENERIC_ENTITY_TT:(.*?)US_STATE_0')
    sent = re.sub(schema_pattern_2, r"\1 GENERIC_ENTITY_TT:US_STATE_0", sent)

    schema_pattern_4 = re.compile(r'LOCATIONFEATURESPECIFICATION_0(.*?). hotel: GENERIC_ENTITY_ORG.SCHEMA.HOTEL:')
    sent = re.sub(schema_pattern_4, r"\1 GENERIC_ENTITY_ORG.SCHEMA.HOTEL:LOCATIONFEATURESPECIFICATION_0", sent)

    fix_pattern = re.compile(r'GENERIC_ENTITY_ORG.SCHEMA.HOTEL\s*:\s*LOCATIONFEATURESPECIFICATION', re.IGNORECASE)
    sent = re.sub(fix_pattern, r"GENERIC_ENTITY_ORG.SCHEMA.HOTEL:LOCATIONFEATURESPECIFICATION", sent)

    schema_pattern_3 = re.compile(r'GENERIC_ENTITY_ORG\.SCHEMA(.*?)LOCATIONFEATURESPECIFICATION', re.IGNORECASE)
    sent = re.sub(schema_pattern_3, r"\1 GENERIC_ENTITY_ORG.SCHEMA.HOTEL:LOCATIONFEATURESPECIFICATION", sent)

    prog_value = duration_date_time_number_pattern.findall(prog)
    sent_value = duration_date_time_number_pattern.findall(sent)
    missing_values = [val for val in prog_value if val not in sent_value]

    if not args.e2e:
        if ('<' in sent or '>' in sent) and len(missing_values) == 0:
            # do another attempt but find missing values between quotations
            prog_value = quoted_pattern_with_space.findall(prog)
            sent_value = quoted_pattern_with_space.findall(sent)
            missing_values = [val for val in prog_value if val not in sent_value]

        if len(missing_values) > 1 and ('<' in sent or '>' in sent):
            print(_id, sent)
            print('Can not refine sentence based on the program entities')

        if len(missing_values) == 1:
            if '<' in sent:
                sent = sent.replace('<', ' ' + missing_values[0] + ' ')
            elif '>' in sent:
                sent = sent.replace('>', ' ' + missing_values[0] + ' ')

    _id, sent, prog = fix_punctuation(_id, sent, prog)

    sent = sent.replace('ي', 'ی')
    sent = sent.replace('ك', 'ک')

    prog = prog.replace('ي', 'ی')
    prog = prog.replace('ك', 'ک')

    # remove spaces from the beginning of the sentence
    while sent[0] == ' ':
        sent = sent[1:]

    translated_time_pattern = re.compile(r'(?:TIM|TEMPO|TEMP|THIM|THME|TMBER)_(\d)', re.IGNORECASE)
    sent = re.sub(translated_time_pattern, r"TIME_\1", sent)

    translated_number_pattern = re.compile(
        r'(?:NUMERO|NUMUMERI|NUMA|NUMBRE|numéro|n\s?ú\s?MERO|n\sú\sMER|NUMULARE)_(\d)', re.IGNORECASE)
    sent = re.sub(translated_number_pattern, r"NUMBER_\1", sent)

    translated_quoted_string_pattern = re.compile(r'(?:q\su\so\sTED_STRING|QUTED_STRING|QUODED_STRING)_(\d)',
                                                  re.IGNORECASE)
    sent = re.sub(translated_quoted_string_pattern, r"QUOTED_STRING_\1", sent)

    translated_duration_string_pattern = re.compile(r'(?:DURAZIONE)_(\d)', re.IGNORECASE)
    sent = re.sub(translated_duration_string_pattern, r"DURATION_\1", sent)

    translated_location_pattern = re.compile(r'(?:LUCATION|LECATION|LIMATION|LAND|LOCCION)_(\d)', re.IGNORECASE)
    sent = re.sub(translated_location_pattern, r"LOCATION_\1", sent)

    # uppercase duration, date, time, number
    sent = re.sub(duration_date_time_number_pattern, lambda match: match.group(1).upper(), sent)

    for val in ['TIME', 'NUMBER', 'DATE', 'DURATION']:
        sent.replace('-{}'.format(val), '- {}'.format(val))

    sent = sent.replace('number_ ', 'NUMBER_0 ')
    sent = sent.replace('NUMBER_ ', 'NUMBER_0 ')
    sent = sent.replace(' UMBER_0', ' NUMBER_0')

    sent = sent.replace('NUMBER_STRING_', 'NUMBER_')
    sent = sent.replace('NUMBER__', 'NUMBER_')

    # only do for dialogs
    # sometimes TIME_0 is translated and not recovered by doing any of the previous heuristics
    if context:
        prog_value = duration_date_time_number_pattern.findall(prog)
        sent_value = duration_date_time_number_pattern.findall(sent)
        context_value = duration_date_time_number_pattern.findall(context)
        missing_values = [val for val in prog_value if val not in sent_value and val not in context_value]
        if len(missing_values) >= 1:
            sent = re.sub(re.compile(r'(?:TIM|TEMPO|TEMP|THIM|THME|MOMENTO|il\s\d+)', re.IGNORECASE), missing_values[0], sent)

    # csp
    if context and ' ; ' in context and args.experiment in ['multiwoz', 'risawoz']:
        slot_values, agent_uttr = context.split(' ; ', 1)
        # ignore agent utterance translation for first context if any
        if _id.rsplit('/', 1)[1] == '0':
            context = slot_values + ' ;'

    return _id, context, sent, prog


def insert_space_quotes(_id, sent, prog):
    # insert spaces when either both or one space is missing
    new_sent = re.sub(quoted_pattern_maybe_space, r' " \1 " ', sent)
    new_sent = re.sub('\s{2,}', ' ', new_sent)

    return _id, new_sent, prog


if args.id_file and args.filter_examples and os.path.exists(args.id_file):
    final_ids = set()
    seq_ids = list()
    input_ids = list()
    with open(args.input_file) as fin:
        for line in fin:
            input_ids.append(line.split('\t')[0].strip())

    with open(args.id_file) as fid:
        for line in fid:
            seq_ids.append(int(line.split('\t')[0].strip()) - 1)
            # seq_ids.append(line.split('\t')[0].strip())

    for id_ in seq_ids:
        final_ids.add(input_ids[id_])
    # final_ids = set(seq_ids)

    assert len(final_ids) == len(seq_ids)

def filter_examples(_id, context, sent, prog, count):
    if args.param_language not in ['zh', 'ja', 'ko']:
        for char in sent:
            if is_cjk_char(ord(char)):
                sent = None
                break
    else:
        not_cjk_count = 0
        for char in sent:
            if not is_cjk_char(ord(char)):
                not_cjk_count += 1
            if not_cjk_count >= 20:
                sent = None
                break

    if _id not in final_ids:
        sent = None

    # if count not in final_ids:
    #     sent = None

    return _id, context, sent, prog


def fix_spaces_cjk(_id, context, sent, prog):
    if any([lang in args.param_language for lang in ['zh', 'ko', 'ja']]):
        # detokenize cjk chars in sentence
        if context:
            context = detokenize_cjk_chars(context)
        sent = detokenize_cjk_chars(sent)
        if not args.nlg:
            prog = detokenize_cjk_chars(prog)

    # remove spaces for bitod; revert this
    # TODO once running new round of exps
    # if args.experiment in ['bitod_en', 'bitod_zh']:
    #     prog = re.sub(r'(=\s".*?")\s', r'\1', prog)
    #     pass

    return _id, context, sent, prog


def remove_spaces_cjk(_id, sent, prog):
    # remove spaces in the sentence and program for CJK
    if any([lang in args.param_language for lang in ['zh', 'ko', 'ja']]):
        sent = sent.replace(' ', '')
        # if after removing both spaces we have entities concatenated
        # with english parameters split them
        new_target_sent = []
        for token in sent.split(' '):
            if len(entity_pattern.findall(token)):
                splitted_tokens = [w for w in entity_pattern.split(token) if w != '']
                new_target_sent.extend(splitted_tokens)
            else:
                new_target_sent.append(token)

        sent = ' '.join(new_target_sent)

        # reduce several spaces to just one
        sent = re.sub(multiple_space_pattern, ' ', sent)
        sent = sent.strip()

        # now program parameters
        # if after removing both spaces we have entities concatenated
        # with english parameters split them
        new_target_prog = []
        params = []
        in_string = False
        for token in prog.split(' '):
            if token == '"':
                if params:
                    new_target_prog.append("".join(params))
                new_target_prog.append('"')
                in_string = not in_string
                params = []
            elif in_string:
                params.append(token)
            else:
                new_target_prog.append(token)

        prog = ' '.join(new_target_prog)

    return _id, sent, prog


def remove_qpis(_id, context, sent, prog):

    if args.e2e:
        history = history_re.search(sent).group(1).strip()
        if user_re.search(history):
            user_text = user_re.search(history).group(1).strip()
        else:
            # USER text is empty
            # likely due to bad translation
            sent = sent.replace('"', '')
            return _id, context, sent, prog
        new_user_text = user_text.replace('"', '')
        new_user_text = re.sub(multiple_space_pattern, ' ', new_user_text)
        new_user_text = new_user_text.strip()
        sent = sent.replace(user_text, new_user_text)
        return _id, context, sent, prog

    if args.dst:
        if ' ; ' in context:
            slot_vals, agent_uttr = context.split(' ; ', 1)
            slot_vals = slot_vals.strip()
            agent_uttr = agent_uttr.strip()
        else:
            slot_vals, agent_uttr = context.split(' ;', 1)

    def fix_sent(sent):
        new_target_sent = []
        for token in sent.split(' '):
            if len(entity_pattern.findall(token)):
                splitted_tokens = [w for w in entity_pattern.split(token) if w != '']
                new_target_sent.extend(splitted_tokens)
            else:
                new_target_sent.append(token)
        sent = ' '.join(new_target_sent)
        return sent

    if 'zh' in args.param_language:
        # remove quotes and spaces around them
        # sent = sent.replace(' " ', '')
        # if after removing both spaces we have entities concatenated
        # with english parameters split them
        sent = fix_sent(sent)
        if context:
            agent_uttr = fix_sent(agent_uttr)

    sent = sent.replace('"', '')
    if args.dst:
        agent_uttr = agent_uttr.replace('"', '')
        agent_uttr = re.sub(multiple_space_pattern, ' ', agent_uttr)
        agent_uttr = agent_uttr.strip()
        context = slot_vals + ' ; ' + agent_uttr

    # reduce several spaces to just one
    sent = re.sub(multiple_space_pattern, ' ', sent)
    sent = sent.strip()

    return _id, context, sent, prog


def remove_qpip_numbers(_id, sent, prog):
    prog = re.sub(quoted_number_pattern, r"\1", prog)
    new_prog = prog.replace('  ', ' ')

    return _id, sent, new_prog


def remove_qspace(_id, sent, prog):
    sent = re.sub(quoted_pattern_with_space, r'"\1"', sent)
    new_sent = sent.replace('  ', ' ')

    return _id, new_sent, prog


def process_oht(_id, sent, prog):
    sent = re.sub(re.compile(r'(?<!\_)\d+[\.|\-]\s*'), '', sent)

    for quote in ["“", "”", "‘", "’", "「", "」"]:
        sent = sent.replace(quote, '"')

    sent = re.sub(re.compile(r'(\"\s?\w+),'), r"\1 ,", sent)
    sent = re.sub(re.compile(r'(\"\s?\w+(?:\s\w+)*),'), r"\1 ,", sent)
    sent = re.sub(re.compile(r'(\"\s?\w+(?:\s\w+)*)\'s'), r"\1 's", sent)

    return _id, sent, prog


def prepare_multiwoz_for_marian(_id, context, sent, prog):
    _id, user_uttr_target, prog = prepare_for_marian(_id, sent, prog)
    if context and ' ; ' in context:
        slot_values, agent_uttr = context.split(' ; ', 1)
    else:
        slot_values, agent_uttr = context.split(' ;', 1)
    _id, agent_uttr_target, prog = prepare_for_marian(_id, agent_uttr, prog)
    if not agent_uttr_target:
        agent_uttr_target = '.'

    slot_values = slot_values.strip()
    return _id, slot_values, agent_uttr_target, user_uttr_target, prog


def prepare_template_for_marian(_id, sent):
    # add quotation mark around @ tokens
    sent = sent.replace('@', '" @ "')

    return _id, sent


def prepare_for_marian(_id, sent, prog):
    if args.e2e:
        history = history_re.search(sent).group(1).strip()
        user_text = user_re.search(history).group(1).strip()
        sent = user_text

    _id, sent, prog = insert_space_quotes(_id, sent, prog)

    def is_in_spans(id, spans):
        for span in spans:
            if span[0] < id < span[1]:
                return True
        return False

    # add quotation mark around capitalized Entities, and pure numbers if not already in quoted strings
    tokens = sent.split(' ')

    # find all quoted spans
    quoted_ids = [i for i in range(len(tokens)) if tokens[i] == '"']
    quoted_spans = [(quoted_ids[i], quoted_ids[i + 1]) for i in range(0, len(quoted_ids), 2)]

    # chinese_cardinals = list(zh2en_CARDINAL_MAP.keys())
    # english_cardinals = list(en2zh_CARDINAL_MAP.keys())

    new_sent = []
    for i, token in enumerate(tokens):
        if token == ' ':
            continue
        if (entity_pattern.match(token) or small_number_pattern.match(token)) and not is_in_spans(i, quoted_spans):
            new_sent.append('"')
            new_sent.append(token)
            new_sent.append('"')
        else:
            new_sent.append(token)
    target_sent = ' '.join(new_sent)
    target_sent = target_sent.strip()

    return _id, target_sent, prog


def prepare_for_gt(_id, sent, prog):
    if sent.endswith('" ?'):
        sent = sent[:-1]

    # add triple quotation marks
    sent = re.sub(quoted_pattern_maybe_space, r'""" \1 """', sent)

    # replace entities with uppercase
    tokens = sent.split(' ')
    new_sent = []
    for token in tokens:
        if entity_pattern.findall(token):
            if token == '':
                continue
            for w in english_regex.split(token):
                if w == '':
                    continue
                elif entity_pattern.findall(w):
                    w = forward_entity_mapping(w)
                    new_sent.append(w)
                else:
                    new_sent.append(w.lower())
        else:
            new_sent.append(token.lower())
    sent = ' '.join(new_sent)

    new_sent = sent

    return _id, new_sent, prog


if __name__ == '__main__':

    if args.match_ids and not args.ref_file:
        raise ValueError('ref_file should be specified when doing match_ids')

    if args.ref_file:
        all_ref_ids = []
        with open(args.ref_file) as f_ref:
            for line in f_ref:
                _id = get_parts(line)[0]
                all_ref_ids.append(_id)

    with open(args.input_file, 'r', encoding='utf-8') as f_in, open(args.output_file, 'w+') as f_out:
        lines = f_in.read().splitlines()
        slot_values = None
        if args.num_lines != -1:
            selected_lines = lines[:min(args.num_lines, len(lines))]
        else:
            selected_lines = lines

        if args.remove_duplicate_sents:
            remove_duplicate_sents(lines, f_out, args.num_columns)

        elif args.reduce_duplicate_progs:
            reduce_duplicate_progs(lines, f_out, args.num_columns)

        else:
            for count, line in enumerate(tqdm(selected_lines)):
                parts = get_parts(line)
                _id, context, sent, prog, extra = None, None, None, None, None
                agent_uttr = None
                if args.num_columns == 1:
                    sent = parts
                elif args.num_columns == 2:
                    _id, sent = parts
                elif args.num_columns == 3:
                    try:
                        _id, sent, prog = parts[:3]
                    except Exception:
                        assert args.nlg and 'sgd' in args.experiment
                        # missannotaions in sgd test set causes empty agent utterances
                        _id, sent = parts[:2]
                        assert 'GOODBYE' in sent or 'goodbye' in sent
                        prog = 'Goodbye'
                    # if have more than one thingtalk annotation keep them
                    extra = parts[3:]
                elif args.num_columns == 4:
                    _id, context, sent, prog = parts[:4]
                    # if have more than one thingtalk annotation keep them
                    extra = parts[4:]
                else:
                    raise ValueError('input cannot have more than 4 columns!')

                if args.nlg:
                    sent, prog = prog, sent
                    args.no_lower_case = True

                # override sentence if empty
                if sent == "":
                    sent = "."

                if args.remove_qpis:
                    _id, context, sent, prog = remove_qpis(_id, context, sent, prog)
                if args.prepare_for_gt:
                    _id, sent, prog = prepare_for_gt(_id, sent, prog)
                if args.process_oht:
                    _id, sent, prog = process_oht(_id, sent, prog)
                if args.match_ids:
                    _id, sent, prog = match_ids(_id, sent, prog, all_ref_ids[count])
                if args.replace_ids:
                    _id, sent, prog = replace_ids(_id, sent, prog, count)
                if args.translate_slot_names:
                    _id, context, sent, prog = translate_slot_names(_id, context, sent, prog)
                if args.translate_slot_values:
                    _id, context, sent, prog = translate_slot_values(_id, context, sent, prog)
                if args.remove_qpip_numbers:
                    _id, sent, prog = remove_qpip_numbers(_id, sent, prog)
                if args.insert_space_quotes:
                    _id, sent, prog = insert_space_quotes(_id, sent, prog)
                if args.refine_sentence:
                    if args.num_columns == 4:
                        _id, context, sent, prog = refine_sentence(_id, context, sent, prog)
                    else:
                        _id, _, sent, prog = refine_sentence(_id, None, sent, prog)
                if args.fix_punctuation:
                    _id, sent, prog = fix_punctuation(_id, sent, prog)
                if args.compute_complexity:
                    _id, sent, prog = compute_complexity(_id, sent, prog)
                if args.remove_qspace:
                    _id, sent, prog = remove_qspace(_id, sent, prog)
                if args.preprocess_paraphrased:
                    _id, sent, prog = preprocess_paraphrased(_id, sent, prog)
                if args.remove_spaces_cjk:
                    _id, sent, prog = remove_spaces_cjk(_id, sent, prog)
                if args.post_process_translation:
                    _id, sent, prog = post_process_translation(_id, sent, prog)
                if args.lexicalize:
                    _id, sent, prog = lexicalize(_id, sent, prog, count)
                if args.delexicalize:
                    _id, sent, prog = delexicalize(_id, sent, prog, count)
                if args.prepare_for_marian:
                    _id, sent, prog = prepare_for_marian(_id, sent, prog)
                if args.prepare_template_for_marian:
                    _id, sent = prepare_template_for_marian(_id, sent)
                if args.prepare_multiwoz_for_marian:
                    _id, slot_values, agent_uttr, sent, prog = prepare_multiwoz_for_marian(_id, context, sent, prog)
                if args.fix_spaces_cjk:
                    _id, context, sent, prog = fix_spaces_cjk(_id, context, sent, prog)
                if args.filter_examples:
                    _id, context, sent, prog = filter_examples(_id, context, sent, prog, count)

                if sent is None:
                    continue

                def lower_case(sent):
                    tokens = sent.split(' ')
                    new_sent = []
                    for token in tokens:
                        if token == ' ':
                            continue
                        if entity_pattern.findall(token):
                            for w in english_regex.split(token):
                                if w == '':
                                    continue
                                elif entity_pattern.findall(w):
                                    new_sent.append(w)
                                else:
                                    new_sent.append(w.lower())
                        else:
                            new_sent.append(token.lower())
                    sent = ' '.join(new_sent)
                    return sent


                if not args.no_lower_case:
                    # lower case sentences unconditionally except for entities
                    sent = lower_case(sent)

                    if agent_uttr:
                        agent_uttr = lower_case(agent_uttr)
                    elif context and ' ;' in context:
                        slot_values, agent_uttr = context.split(' ;', 1)
                        agent_uttr = agent_uttr.strip()
                        agent_uttr = lower_case(agent_uttr)
                        context = slot_values + ' ; ' + agent_uttr if agent_uttr else slot_values + ' ;'

                if not args.no_unicode_normalize:
                    sent = unicodedata.normalize('NFD', sent)
                    if prog is not None:
                        prog = unicodedata.normalize('NFD', prog)
                    if context is not None:
                        context = unicodedata.normalize('NFD', context)
                    if slot_values:
                        slot_values = unicodedata.normalize('NFD', slot_values)

                    if extra is not None:
                        new_extra = []
                        for item in extra:
                            new_extra.append(unicodedata.normalize('NFD', item))
                        extra = new_extra.copy()

                # reduce multiple spaces
                space_pattern = re.compile(r'\s{2,}')
                sent = re.sub(space_pattern, ' ', sent)
                if prog:
                    prog = re.sub(space_pattern, ' ', prog)
                if context:
                    context = re.sub(space_pattern, ' ', context)
                if slot_values:
                    slot_values = re.sub(space_pattern, ' ', slot_values)

                if 'the the' in sent:
                    sent = sent.replace('the the', 'the')

                if args.nlg:
                    sent, prog = prog, sent

                if args.num_columns == 1:
                    f_out.write(sent + '\n')
                elif args.num_columns == 2:
                    f_out.write('\t'.join([_id, sent]) + '\n')
                elif args.num_columns == 3:
                    f_out.write('\t'.join([_id, sent, prog, *extra]) + '\n')
                elif args.num_columns == 4:
                    if args.prepare_multiwoz_for_marian:
                        f_out.write('\t'.join([_id, slot_values, agent_uttr, sent, prog, *extra]) + '\n')
                    else:
                        f_out.write('\t'.join([_id, context, sent, prog, *extra]) + '\n')
