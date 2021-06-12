#!/bin/bash

set -e
set -x

pyenv global 3.8.1

mkdir -p ./tmp

git clone --depth 1 -b 2021.6.3 'https://github.com/home-assistant/core' ./tmp/homeassistant

test -d ./tmp/homeassistant-venv || virtualenv ./tmp/homeassistant-venv
. ./tmp/homeassistant-venv/bin/activate
pip3 install -r ./tmp/homeassistant/requirements.txt
pip3 install -e ./tmp/homeassistant
deactivate

./scripts/run-home-assistant.sh &
# wait 30 seconds for Home Assistant to install itself and set up
sleep 30

./scripts/setup-ha-virtual-devices.js main universe
