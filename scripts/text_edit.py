# Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
#
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
#
# Author: Mehrad Moradshahi <mehrad@cs.stanford.edu>

## Adapted from stanford-oval/genie-wrokdirs/spl/scripts/text_edit.py

import argparse
import re
import unicodedata
from tqdm import tqdm

from genienlp.data_utils.almond_utils import detokenize_cjk_chars


punctuation_string = "?!.\u060c\u061F"
quoted_pattern_maybe_space = re.compile(r'\"\s?([^"]*?)\s?\"')
english_regex = re.compile(r"([a-zA-Z\-][a-zA-Z_\-'s\.:]*[_0-9]?|\b[a-z0-9]*\b|\d+|'s)")
english_person_names = re.compile(r"\b(\w+\s\w(?!\s\.))\b")

quoted_pattern_no_space = re.compile(r'\"([^"]*?)\"')
quoted_pattern_with_space = re.compile(r'\"\s([^"]*?)\s\"')
quoted_number_pattern = re.compile(r'\"\s(\d{1,2})\s\"')
duration_date_time_number_pattern = re.compile(r'(DURATION_\d|DATE_\d|TIME_\d|NUMBER_\d)', re.IGNORECASE)
multiple_space_pattern = re.compile(r'\s{2,}')

entity_pattern = re.compile(r'([A-Z][A-Z_]*_[0-9]+|GENERIC_ENTITY_[a-zA-Z\.:\d]+)')
number_pattern = re.compile(r'\b([0-9]+)\b')
small_number_pattern = re.compile(r'\b([0-9])\b')

parser = argparse.ArgumentParser()

parser.add_argument('--input_file', type=str, help='input file to read from')
parser.add_argument('--ref_file', type=str, help='reference file to read from; used to read ids from')
parser.add_argument('--id_file', type=str, help='only keep sentences that their ids is in this file ')
parser.add_argument('--output_file', type=str, help='output file to write translations to')
parser.add_argument('-n', '--num_lines', default=-1, type=int,
                    help='maximum number of lines to translate (-1 to translate all)')
parser.add_argument('--input_delimiter', default='\t', type=str, help='delimiter used to split input files')
parser.add_argument('--remove_qpis', action='store_true', help='')
parser.add_argument('--prepare_for_marian', action='store_true', help='')
parser.add_argument('--post_process_translation', action='store_true', help='')
parser.add_argument('--match_ids', action='store_true', help='')
parser.add_argument('--add_token', default='T', help='prepend ids with this token after matching ids')
parser.add_argument('--replace_ids', action='store_true', help='replace dataset ids with sequential unique values')
parser.add_argument('--insert_space_quotes', action='store_true',
                    help='insert space between quotation marks and parameters if removed during translation')
parser.add_argument('--refine_sentence', action='store_true', help='')
parser.add_argument('--fix_punctuation', action='store_true', help='')
parser.add_argument('--param_language', default='en')
parser.add_argument('--src_lang', default='en')
parser.add_argument('--tgt_lang', default='en')
parser.add_argument('--num_columns', type=int, default=3, help='number of columns in input file')
parser.add_argument('--no_lower_case', action='store_true', help='do not lower case tokens')
parser.add_argument('--no_unicode_normalize', action='store_true', help='do not unicode normalize examples')
parser.add_argument('--fix_spaces_cjk', action='store_true', help='')
parser.add_argument('--experiment', type=str, help='')

args = parser.parse_args()


def capitalize(match):
    if isinstance(match, str):
        word = match
    else:
        word = match.group(0)
    return word[0].upper() + word[1:].lower()


def upper(match):
    word = match.group(0)
    return word.upper()


def post_process_translation(_id, target_sent, prog):
    target_sent = target_sent.strip()

    # insert space before punctuation if not already there
    if target_sent and target_sent[-1] in punctuation_string and target_sent[-2] != ' ':
        target_sent = target_sent[:-1] + ' ' + target_sent[-1]

    # insert space between quotation marks and their enclosed param value
    target_sent = re.sub(quoted_pattern_maybe_space, r'" \1 "', target_sent)

    # ' s --> 's
    target_sent = target_sent.replace("' s", "'s")

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
                    else:
                        new_sent.append(w.lower())
            else:
                new_sent.append(token.lower())
        target_sent = ' '.join(new_sent)

    return _id, target_sent, prog


def get_parts(line):
    parts = tuple(map(lambda text: text.strip(), re.split(args.input_delimiter, line.strip())))
    return parts


def replace_ids(_id, sent, prog, count):
    return str(count + 1), sent, prog


def fix_punctuation(_id, sent, prog):
    # insert space before punctuation if not already
    if sent[-1] in punctuation_string and sent[-2] != ' ':
        sent = sent[:-1] + ' ' + sent[-1]

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


    prog_value = duration_date_time_number_pattern.findall(prog)
    sent_value = duration_date_time_number_pattern.findall(sent)
    missing_values = [val for val in prog_value if val not in sent_value]

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

    return _id, context, sent, prog


def insert_space_quotes(_id, sent, prog):
    # insert spaces when either both or one space is missing
    new_sent = re.sub(quoted_pattern_maybe_space, r' " \1 " ', sent)
    new_sent = re.sub('\s{2,}', ' ', new_sent)

    return _id, new_sent, prog

def fix_spaces_cjk(_id, context, sent, prog):
    if any([lang in args.param_language for lang in ['zh', 'ko', 'ja']]):
        # detokenize cjk chars in sentence
        if context:
            context = detokenize_cjk_chars(context)
        sent = detokenize_cjk_chars(sent)
        prog = detokenize_cjk_chars(prog)

    return _id, context, sent, prog


def remove_qpis(_id, context, sent, prog):

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
            context = fix_sent(context)

    sent = sent.replace('"', '')

    # reduce several spaces to just one
    sent = re.sub(multiple_space_pattern, ' ', sent)
    sent = sent.strip()

    return _id, context, sent, prog


def prepare_for_marian(_id, sent, prog):

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

        for count, line in enumerate(tqdm(selected_lines)):
            parts = get_parts(line)
            _id, context, sent, prog, extra = None, None, None, None, None
            agent_uttr = None
            if args.num_columns == 1:
                sent = parts
            elif args.num_columns == 2:
                _id, sent = parts
            elif args.num_columns == 3:
                _id, sent, prog = parts[:3]
                # if have more than one thingtalk annotation keep them
                extra = parts[3:]
            elif args.num_columns == 4:
                _id, context, sent, prog = parts[:4]
                # if have more than one thingtalk annotation keep them
                extra = parts[4:]
            else:
                raise ValueError('input cannot have more than 4 columns!')

            # override sentence if empty
            if sent == "":
                sent = "."

            if args.remove_qpis:
                _id, context, sent, prog = remove_qpis(_id, context, sent, prog)
            if args.match_ids:
                _id, sent, prog = match_ids(_id, sent, prog, all_ref_ids[count])
            if args.replace_ids:
                _id, sent, prog = replace_ids(_id, sent, prog, count)
            if args.insert_space_quotes:
                _id, sent, prog = insert_space_quotes(_id, sent, prog)
            if args.refine_sentence:
                if args.num_columns == 4:
                    _id, context, sent, prog = refine_sentence(_id, context, sent, prog)
                else:
                    _id, _, sent, prog = refine_sentence(_id, None, sent, prog)
            if args.fix_punctuation:
                _id, sent, prog = fix_punctuation(_id, sent, prog)
            if args.post_process_translation:
                _id, sent, prog = post_process_translation(_id, sent, prog)
            if args.prepare_for_marian:
                _id, sent, prog = prepare_for_marian(_id, sent, prog)
            if args.fix_spaces_cjk:
                _id, context, sent, prog = fix_spaces_cjk(_id, context, sent, prog)

            if sent is None:
                continue

            if not args.no_lower_case:
                # lower case sentences unconditionally except for entities
                sent = lower_case(sent)

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

            if args.num_columns == 1:
                f_out.write(sent + '\n')
            elif args.num_columns == 2:
                f_out.write('\t'.join([_id, sent]) + '\n')
            elif args.num_columns == 3:
                f_out.write('\t'.join([_id, sent, prog, *extra]) + '\n')
            elif args.num_columns == 4:
                f_out.write('\t'.join([_id, context, sent, prog, *extra]) + '\n')
