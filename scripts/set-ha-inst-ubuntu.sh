#!/bin/bash

set -e

sudo apt-get install -y python3 python3-dev python3-venv python3-pip libffi-dev libssl-dev libjpeg-dev zlib1g-dev autoconf build-essential libopenjp2-7 libtiff5 libturbojpeg0-dev tzdata

python3 -m pip install wheel

echo "Check if pyenv is available"

test ! -d  ~/.pyenv && git clone https://github.com/pyenv/pyenv.git ~/.pyenv || echo "PYENV already installed"
test ! -d  ~/.pyenv && echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bash_profile
test ! -d  ~/.pyenv && (echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bash_profile && echo "NOW PLEASE CLOSE THE TERMINAL AND REOPEN IT" && exi>
test -d  ~/.pyenv/versions/3.9.10 || pyenv install 3.9.10
