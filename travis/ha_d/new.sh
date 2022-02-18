#!/bin/bash

set -e
set -x

#add test for pyenv
#git clone https://github.com/pyenv/pyenv.git ~/.pyenv
# for Bash
#echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bash_profile
#echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bash_profile
#close and reopen terminal

test -d  ~/.pyenv/versions/3.9.10 || pyenv install 3.9.10

pyenv global 3.9.10

git clone https://github.com/home-assistant/core.git homeassistant

cd homeassistant

python3 -m pip install wheel

python3 -m venv .

source bin/activate

pip3 install -r requirements.txt

deactivate

#mkdir -p ./tmp

#test -d ./tmp/homeassistant-venv || virtualenv --py $(pyenv which python3.9.10) .tmp/homeassistant-venv
#. ./tmp/homeassistant-venv/bin/activate
#python3 --version
#pip3 install 'homeassistant==2022.2.6'
#deactivate

#./scripts/run-home-assistant.sh &
# wait 30 seconds for Home Assistant to install itself and set up
#sleep 30

#./scripts/setup-ha-virtual-devices.js main universe
#sleep 30
