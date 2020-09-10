#!/usr/bin/python3

import sys
from collections import defaultdict

def main():
    alltargets = defaultdict(set)

    for line in sys.stdin:
        _id, context, sentence, target = line.strip().split('\t')

        key = (context, sentence)
        alltargets[key].add(target)

    for key, targets in alltargets.items():
        if len(targets) <= 1:
            continue
        print()
        print(key[0])
        print(key[1], sep='\t')
        for target in targets:
            print(target)

main()
