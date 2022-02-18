#!/bin/bash

set -e

sudo dnf -y install python3-devel redhat-rpm-config libffi-devel libjpeg-devel python-virtualenv openssl-devel gtk+-devel gcc-c++ zlib-devel libtidy turbojpeg
sudo dnf groupinstall "Development Tools" "Development Libraries"
sudo yum install libtiff.so.5