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

test -d ./tmp || mkdir -p ./tmp
test -d ./tmp/homeassistant-venv || mkdir -p ./tmp/homeassistant-venv
test -d ./tmp/homeassistant-config || mkdir -p ./tmp/homeassistant-config

python3 -m venv ./tmp/homeassistant-venv 

source ./tmp/homeassistant-venv/bin/activate

#wget -q https://github.com/home-assistant/core/blob/f069a37f7da0864f760710269eb3567aa33d5d56/requirements.txt

#test -d ./tmp/homeassistant-venv || virtualenv --py $(pyenv which python3) .tmp/homeassistant-venv
#test -d ./tmp/homeassistant-venv || virtualenv --py $(pyenv which python3) .tmp/homeassistant-venv


#pip3 install -r requirements.txt

#source ./tmp/homeassistant-venv/bin/activate

pip3 install 'homeassistant==2022.2.6'

deactivate

#./scripts/run-home-assistant.sh &
# wait 30 seconds for Home Assistant to install itself and set up
#sleep 30

#./scripts/setup-ha-virtual-devices.js main universe
#sleep 30
