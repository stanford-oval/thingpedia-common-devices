#!/bin/bash

set -e

check_os=[`. /etc/os-release; echo "$NAME"`]

echo "This OS is $check_os"

if [[ $check_os == *"Ubuntu"* ]];
then
    echo "Setting Ubuntu for Home assistant installation"
    sleep 15
    . ./scripts/set-ha-inst-ubuntu.sh
elif [[ $check_os == *"Fedora"* ]];
then
    echo "Setting Fedora for Home assistant installation"
    sleep 15
    . ./scripts/set-ha-inst-fedora.sh
else
    echo "OS NOT RECOGNIZED"
    sleep 15
    exit 0
fi

python3 -m pip install wheel

echo "Check if pyenv is available"

test ! -d  ~/.pyenv && git clone https://github.com/pyenv/pyenv.git ~/.pyenv || echo "PYENV already installed"
test ! -d  ~/.pyenv && echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bash_profile
test ! -d  ~/.pyenv && (echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bash_profile && echo "NOW PLEASE CLOSE THE TERMINAL AND REOPEN IT" && sleep 30 && exit 0 )
test -d  ~/.pyenv/versions/3.9.10 || pyenv install 3.9.10

pyenv global 3.9.10

test -d ./ha || mkdir -p ./ha
test -d ./ha/homeassistant-venv || mkdir -p ./ha/homeassistant-venv
test -d ./ha/homeassistant-config || mkdir -p ./ha/homeassistant-config

python3 -m venv ./ha/homeassistant-venv

source ./ha/homeassistant-venv/bin/activate

pip3 install 'homeassistant==2022.2.6'

deactivate

./scripts/run-home-assistant.sh &
echo "wait 30 seconds for Home Assistant to install itself and set up"
sleep 30

./scripts/setup-ha-virtual-devices.js main universe
echo "Set virtual devices"
sleep 30
