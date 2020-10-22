import json
import sys
import csv

def write_ui_metadata(results):
  results = open(sys.argv[1]).read()
  metadata = {"outputs" : [
    {
      "storage": "inline",
      "source": results,
      "format": 'csv',
      "type": "table",
      "header": ["Eval Set", "Device", "Turn Number", "# turns","Accuracy", 
                 "W/o params", "Function", "Device", "Num Function", "Syntax"]
    }
  ]} 
  with open('/tmp/mlpipeline-ui-metadata.json', 'w') as f:
    json.dump(metadata, f)


def write_metrics(results):
  metrics = []
  sum = 0
  cnt = 0
  for row in csv.reader(open(sys.argv[1])):
    sum += float(row[4])
    cnt += 1
  accuracy = sum/cnt
  metrics = {
    'metrics': [{
      'name': 'average-accuracy',
      'numberValue':  accuracy, 
      'format': "PERCENTAGE",
    }]
  }       
  with open('/tmp/mlpipeline-metrics.json', 'w') as f:
    json.dump(metrics, f)


if __name__ == '__main__':
  results = open(sys.argv[1]).read()
  write_ui_metadata(results)
  write_metrics(results)
