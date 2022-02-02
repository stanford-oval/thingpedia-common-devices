import argparse
import json
import re


parser = argparse.ArgumentParser()

parser.add_argument('--input')
parser.add_argument('--output')
parser.add_argument('--output_format', choices=['json', 'csv'])

args = parser.parse_args()

ENTITY_ITEMS = {'DATE', 'NUMBER', 'MEASURE', 'QUOTED_STRING', 'TIME', 'CURRENCY', 'LOCATION', 'USERNAME'}

input = json.load(open(args.input))

data = input['data']
all_ids = set()
all_names = set()

new_items = []
for item in data:
    if any(re.search(banned_re + '_\d',  item['canonical']) for banned_re in ENTITY_ITEMS):
        continue
    # if item['value'] in all_ids:
    #     continue
    # if item['name'] in all_names:
    #     continue
    new_items.append(item)
    all_ids.add(item['value'])
    all_names.add(item['name'])


if args.output_format == 'json':
    json.dump({'result': 'ok', 'data': new_items}, open(args.output, 'w'), ensure_ascii=False)
else:
    with open(args.output, 'w') as fout:
        for item in new_items:
            fout.write(','.join([item['value'], '"' + item['name'] + '"']) + '\n')


print(f"size reduced from {len(data)} to {len(new_items)}")
