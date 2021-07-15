#!/bin/bash

set -e
set -x

pyenv global 3.8.1

mkdir -p ./tmp

test -d ./tmp/homeassistant-venv || virtualenv --py $(which python3) ./tmp/homeassistant-venv
. ./tmp/homeassistant-venv/bin/activate
pip3 install 'homeassistant==2021.6.3'
deactivate

./scripts/run-home-assistant.sh &
# wait 30 seconds for Home Assistant to install itself and set up
sleep 30

./scripts/setup-ha-virtual-devices.js main universe
sleep 30
