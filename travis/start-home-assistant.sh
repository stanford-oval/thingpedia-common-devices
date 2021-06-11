#!/bin/bash

set -e
set -x

./scripts/run-home-assistant.sh &

# wait 60 seconds for Home Assistant to install itself and set up
sleep 60

./scripts/setup-ha-virtual-devices.js main universe
