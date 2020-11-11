# Device Package Layout

Each device is in a folder named after the device ID. The folder contains:

- `manifest.tt`: the Thingpedia device definition
- `dataset.tt`: additional primitive templates for the Thingpedia device
- `icon.png`: the icon in Thingpedia
- `eval/`: evaluation data (one folder for dev and one for test)
- `eval/*/input.txt`: bare dialogues between user and agent
- `eval/*/annotated.txt`: annotated dialogues
- `paraphrase/`: (optional) paraphrase data
- `package.json` and `yarn.lock`: node package definition and dependency list for the Thingpedia device, if the device needs custom JS code
- `*.js`: custom JS code used by the Thingpedia device
- `node_modules/`: (optional, generated) NPM dependencies for the device

All files included in a device folder are packaged and available when the
device is run on the client device, so you can include additional data files
or JSON files, _with the exception of_:
- the entire `eval/` folder
- `icon.png`
- `manifest.tt` and `dataset.tt`
