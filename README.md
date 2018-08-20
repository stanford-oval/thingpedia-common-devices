# Various Thingpedia Devices

[![Build Status](https://travis-ci.com/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices.svg?branch=master)](https://travis-ci.com/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices) [![Coverage Status](https://coveralls.io/repos/github/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices/badge.svg?branch=master)](https://coveralls.io/github/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices?branch=master)

## Knowledge for your Virtual Assistant

Thingpedia is the open, crowdsourced knowledge base for virtual assistants.
Anyone can contribute the interface code to access any device or
web service to Thingpedia.

This repository contains a small subset of the interfaces hosted
on Thingpedia, that are maintained by the Thingpedia authors.

These interfaces cannot be used alone: each interface must be packaged
and uploaded separately to Thingpedia, to be used by some installation
of the Almond virtual assistant.
While a package.json is present at the top of this repository, its purpose
is only to declare dependencies used in automatic testing. Directly importing
this package, or any of the Thingpedia interfaces, is likely to fail without
the necessary surrounding code.
Please refer to [almond-cmdline](https://github.com/Stanford-Mobisocial-IoT-Lab/almond-cmdline)
for an example of a complete application that makes use of these, and other,
Thingpedia interfaces.

Thingpedia is part of Almond, a research project led by
prof. Monica Lam, from Stanford University.  You can find more
information at <https://almond.stanford.edu>.


