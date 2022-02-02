import argparse
import os
import numpy as np

parser = argparse.ArgumentParser()

parser.add_argument('--input_file', )
parser.add_argument('--input_names', )
parser.add_argument('--input_numbers', )
parser.add_argument('--output_folder', )

args = parser.parse_args()

with open(args.input_numbers) as fin:
    numbers = fin.read().splitlines()
    numbers = np.cumsum(list(map(int, numbers)))

with open(args.input_names) as fin:
    names = fin.read().splitlines()

counter = 0
line_count = numbers[counter]
fname = names[counter]
file = open(os.path.join(args.output_folder, fname), 'w')

with open(args.input_file) as fin:
    for i, line in enumerate(fin):

        if i >= line_count:
            file.close()
            counter += 1
            if counter == len(names):
                break
            line_count = numbers[counter]
            fname = names[counter]
            file = open(os.path.join(args.output_folder, fname), 'w')

        file.write(line)




