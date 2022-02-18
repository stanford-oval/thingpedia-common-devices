#!/bin/bash

set -e

sudo dnf -y install python3-devel redhat-rpm-config libffi-devel libjpeg-devel python-virtualenv openssl-devel gtk+-devel gcc-c++ zlib-devel libtidy turbojpeg
sudo dnf groupinstall "Development Tools" "Development Libraries"
sudo yum install libtiff.so.5

python3 -m pip install wheel

echo "Check if pyenv is available"

test ! -d  ~/.pyenv && git clone https://github.com/pyenv/pyenv.git ~/.pyenv || echo "PYENV already installed"
test ! -d  ~/.pyenv && echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.bash_profile
test ! -d  ~/.pyenv && (echo 'export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.bash_profile && echo "NOW PLEASE CLOSE THE TERMINAL AND REOPEN IT" && exi>
test -d  ~/.pyenv/versions/3.9.10 || pyenv install 3.9.10

