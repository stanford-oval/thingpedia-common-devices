#!/bin/bash

set -e
set -x

test -d  ~/.pyenv/versions/3.10.2 || pyenv install 3.10.2

pyenv global 3.10.2

mkdir -p ./tmp

test -d ./tmp/homeassistant-venv || virtualenv --py $(pyenv which python3.10) .tmp/homeassistant-venv
. ./tmp/homeassistant-venv/bin/activate
python3 --version
pip3 install 'homeassistant==2022.2.5'
deactivate

./scripts/run-home-assistant.sh &
# wait 30 seconds for Home Assistant to install itself and set up
sleep 30

./scripts/setup-ha-virtual-devices.js main universe
sleep 30
