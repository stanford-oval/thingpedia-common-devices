import argparse

parser = argparse.ArgumentParser()

parser.add_argument('--input_file', )
parser.add_argument('--input_names', )
parser.add_argument('--input_numbers', )
parser.add_argument('--output_folder', )

args = parser.parse_args()

with open(args.input_numbers) as fin:
    numbers = fin.readlines()

with open(args.input_names) as fin:
    names = fin.readlines()

counter = 0
line_count = numbers[counter]
fname = names[counter]
file = open(fname, 'w')

with open(args.input_file) as fin:
    for i, line in enumerate(file):

        if i >= line_count:
            file.close()
            counter += 1
            line_count = numbers[counter]
            fname = names[counter]
            file = open(fname, 'w')

        file.write(line)




