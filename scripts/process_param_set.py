import argparse
import json

parser = argparse.ArgumentParser()

parser.add_argument('--input_file', )
parser.add_argument('--output_file', )
parser.add_argument('--translated_file', )
parser.add_argument('--task', )

args = parser.parse_args()

# args.output_file = args.output_file.rsplit('.', 1)[0] + '.tsv'

if args.input_file.endswith('.json'):
    type = 'json'
else:
    type = 'tsv'

def remove_quotes(text):
    text = text.replace('"', '').replace('  ', ' ')
    return text

if args.task == 'prepare_input':
    if type == 'json':
        with open(args.input_file) as fin:
            data = json.load(fin)['data']

        with open(args.output_file, 'w') as fout:
            for i, item in enumerate(data):
                fout.write('\t'.join([str(i), remove_quotes(data[i]['canonical'])]) + '\n')

    elif type == 'tsv':
        with open(args.input_file) as fin, open(args.output_file, 'w') as fout:
            for i, line in enumerate(fin):
                parts = line.strip('\n').split('\t')
                fout.write('\t'.join([str(i), remove_quotes(parts[1])]) + '\n')

elif args.task == 'postprocess_output':
    if type == 'json':
        with open(args.input_file) as fin:
            input_data = json.load(fin)['data']

        new_data = []
        with open(args.translated_file) as ftrans:
            for i, line in enumerate(ftrans):
                parts = line.strip('\n').split('\t')
                sentence = parts[1]
                new_data.append({'value': input_data[i]['value'], 'name': sentence, 'canonical': sentence})

        with open(args.output_file, 'w') as fout:
            final = {'result': 'ok', 'data': new_data}
            json.dump(new_data, fout)

    elif type == 'tsv':
        with open(args.input_file) as fin, open(args.translated_file) as ftrans, open(args.output_file, 'w') as fout:
            for i, (line, trans_line) in enumerate(zip(fin, ftrans)):
                parts = line.strip('\n').split('\t')
                sentence = trans_line.strip('\n').split('\t')[1]

                fout.write('\t'.join([sentence, sentence, parts[2]]) + '\n')
