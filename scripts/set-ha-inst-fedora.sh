#!/bin/bash

set -e

sudo dnf -y install python3-devel sqlite-devel redhat-rpm-config libffi-devel libjpeg-devel python-virtualenv openssl-devel gtk+-devel gcc-c++ zlib-devel libtidy turbojpeg

sudo dnf -y groupinstall "Development Tools" "Development Libraries"

sudo yum -y install libtiff.so.5
