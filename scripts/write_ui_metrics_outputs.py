import json
import sys
import csv

def write_ui_metadata(dialogue_results, nlu_results):
  metadata = {"outputs" : [
    {
      "storage": "inline",
      "source": dialogue_results,
      "format": 'csv',
      "type": "table",
      "header": [ "set", "# dlgs", "# turns",
          "complete dlgs exact match", "complete dlgs slot only",
          "first turns exact match", "first turns slot only",
          "turn by turn exact match", "turn by turn slot only",
          "up to error exact match", "up to error slot only",
          "time to first error exact match", "time to first error slot only" 
      ]
    },
    {
      "storage": "inline",
      "source": nlu_results,
      "format": 'csv',
      "type": "table",
      "header": ["Eval Set", "Device", "Turn Number", "# turns", "Accuracy", 
                 "W/o params", "Function", "Device", "Num Function", "Syntax"]
    },
  ]} 
  with open('/tmp/mlpipeline-ui-metadata.json', 'w') as f:
    json.dump(metadata, f)


def write_metrics(dialogue_filepath):
  for row in csv.reader(open(dialogue_filepath)):
      first_turn, turn_by_turn = row[5], row[7]
  metrics = {
    'metrics': [
      { 'name': 'first-turn-em', 'numberValue':  first_turn, 'format': "PERCENTAGE"},
      { 'name': 'turn-by-turn-em', 'numberValue':  turn_by_turn, 'format': "PERCENTAGE"},
    ]
  }
  with open('/tmp/mlpipeline-metrics.json', 'w') as f:
    json.dump(metrics, f)


if __name__ == '__main__':
  dialogue_results = open(sys.argv[1]).read()
  nlu_results = open(sys.argv[2]).read()
  write_ui_metadata(dialogue_results, nlu_results)
  write_metrics(sys.argv[1])
