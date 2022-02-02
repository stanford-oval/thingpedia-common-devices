import argparse
from collections import defaultdict

parser = argparse.ArgumentParser()

parser.add_argument('--user_file')
parser.add_argument('--agent_file')

parser.add_argument('--chit_chat_file')

parser.add_argument('--output_file')

args = parser.parse_args()


def parse_id(id_):

    base_id, rest = id_.rsplit('/', 1)
    turn_num = int(rest.split('-', 1)[0])

    return base_id, turn_num

user = defaultdict(lambda: defaultdict())
with open(args.user_file) as fin:
    for line in fin:
        id_, context, sent, program = line.strip('\n').split('\t')
        if 'turking' in id_:
            continue
        base_id, turn_num = parse_id(id_)
        user[base_id][turn_num] = sent


agent = defaultdict(lambda: defaultdict())
with open(args.agent_file) as fin:
    for line in fin:
        id_, context, sent, program = line.strip('\n').split('\t')
        if 'turking' in id_:
            continue
        base_id, turn_num = parse_id(id_)
        agent[base_id][turn_num] = sent

agent_ids = set(agent.keys())


all_convos = []
for id_, user_turns in user.items():
    convo = []
    agent_turns = None
    if id_ in agent_ids:
        agent_turns = agent[id_]
    else:
        # want at least one agent turn
        continue

    for i in range(len(user_turns) + 1):
        if i in agent_turns:
            convo.append('system: ' + agent_turns[i])
        if i in user_turns:
            convo.append('user: ' + user_turns[i])


    all_convos.append(convo)

with open(args.output_file, 'w') as fout:
    for turns in all_convos:
        convo_line = ' '.join(turns)
        if convo_line:
            fout.write(convo_line + '\n' + '[DONE]' + '\n')


chit_chats = []
if args.chit_chat_file:
    with open(args.chit_chat_file) as fin, open(args.output_file + '.ff', 'w') as fout:
        i = -1
        for line in fin:
            if '[TransformerGenerator]:' in line:
                i += 1
                line = line[len('Enter Your Message: [TransformerGenerator]:'):].strip()
                fout.write('====' + '\n')
                if len(all_convos[i]):
                    for turn in all_convos[i]:
                        fout.write(turn + '\n')
                fout.write(line + '\n')

