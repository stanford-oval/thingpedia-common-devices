#!/usr/bin/env python3

import sys
import os
import numpy as np

def measure(corpus):
    vocab = set()
    for sentence in corpus:
        vocab.update(sentence.split(' '))

    vocab = list(vocab)
    vocab.sort()
    vocab.insert(0, '</s>')
    vocab.insert(0, '<s>')
    vocab = dict(((w,i) for i,w in enumerate(vocab)))

    start_id = vocab['<s>']
    eos_id = vocab['</s>']

    V = len(vocab)
    bigrams = np.zeros((V,V), dtype=np.int32)

    for sentence in corpus:
        words = sentence.split(' ')

        for i in range(len(words)+1):
            if i >= len(words):
                curr = eos_id
            else:
                curr = vocab[words[i]]
            if i == 0:
                prev = start_id
            else:
                prev = vocab[words[i-1]]
            bigrams[prev][curr] += 1

    total_bigrams = np.sum(bigrams)
    nonzero_bigrams = bigrams[bigrams != 0].flatten().astype(np.float32)
    nonzero_bigrams /= total_bigrams
    num_bigrams = len(nonzero_bigrams)

    bigram_entropy = - np.sum(nonzero_bigrams * np.log(nonzero_bigrams))
    return bigram_entropy

def process(dataset):
    num_dialogues = 0
    num_turns = 0
    if os.path.exists(os.path.join(dataset, 'synthetic.txt')):
        with open(os.path.join(dataset, 'synthetic.txt')) as fp:
            for line in fp:
                if line.strip() == '====':
                    num_dialogues += 1
                elif line.startswith('U:'):
                    num_turns += 1

    num_synthetic_sentences = 0
    with open(os.path.join(dataset, 'user/synthetic.user.tsv')) as fp:
        for line in fp:
            num_synthetic_sentences += 1

    sentence_corpus = []
    context_corpus = []
    target_corpus = []
    num_training_sentences = 0
    with open(os.path.join(dataset, 'user/train.tsv'), 'r') as fp:
        for line in fp:
            _id, context, sentence, target_code = line.strip().split('\t')
            sentence_corpus.append(sentence)
            context_corpus.append(context)
            target_corpus.append(target_code)
            num_training_sentences += 1

    sentence_entropy = measure(sentence_corpus)
    context_entropy = measure(context_corpus)
    target_entropy = measure(target_corpus)
    num_contexts = len(set(context_corpus))

    print(dataset, num_dialogues, num_synthetic_sentences, num_training_sentences,
          context_entropy, sentence_entropy, target_entropy,
          num_turns/num_dialogues, num_contexts, sep='\t')

#print('dataset', 'num_dialogues', 'num_synthetic_sentences', 'num_training_sentences',
#      'context_entropy', 'sentence_entropy', 'target_entropy',
#      'num_turns/num_dialogues', 'num_contexts', sep='\t')
for f in sys.argv[1:]:
    process(f)
