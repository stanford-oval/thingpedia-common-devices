# Thingpedia Devices for Almond

[![Build Status](https://travis-ci.com/stanford-oval/thingpedia-common-devices.svg?branch=master)](https://travis-ci.com/stanford-oval/thingpedia-common-devices) [![Coverage Status](https://coveralls.io/repos/github/stanford-oval/thingpedia-common-devices/badge.svg?branch=master)](https://coveralls.io/github/stanford-oval/thingpedia-common-devices?branch=master)

## Knowledge for your Virtual Assistant

Thingpedia is the open, crowdsourced knowledge base for virtual assistants.
Anyone can contribute the interface code to access any device or
web service to Thingpedia.

This repository contains the interfaces hosted on Thingpedia that are
maintained collaboratively by the Thingpedia authors and various contributors.

These interfaces cannot be used alone: each interface must be packaged
and uploaded separately to Thingpedia, to be used by some installation
of the Almond virtual assistant.
While a package.json is present at the top of this repository, its purpose
is only to declare dependencies used to train dialogue models and test
the devices. You cannot import this package directly.

Thingpedia is part of Almond, a research project led by
prof. Monica Lam, from Stanford University.  You can find more
information at <https://almond.stanford.edu>.

## Repository Organization

The devices in this repository are divided in three release channels, based
on their development maturity:

- `main`: curated, high-quality, officially supported Thingpedia devices that are 
  are continuously tested and and reasonably expected to work on all supported
  Almond platforms.
- `universe`: community-supported Thingpedia devices that at some point passed
  our standard of quality but might be out of date with upstream API changes or
  lack newer functionality; `universe` devices are also automatically tested and
  have their dependencies updated automatically.
- `staging`: incubator for newly developed Thingpedia devices, not yet ready for
  wide use; staging devices are not regularly tested and might have out-of-date
  dependencies or security vulnerabilities; use `staging` devices at your own risk.
  
## Documentation

See [doc/index.md](doc/index.md) for all the documentation associated with this
repository, including the layout of each device, and the developer workflow.

## License

The scripts in this repository are generally under 3-Clause BSD license, with
a few exceptions in Apache 2.0, indicated at the top of each file.

Each Thingpedia device is copyright of the respective author, and has a copyright
notice at the top of the file, as well as a `#[license]` annotation in SPDX format
in the `manifest.tt` file.

Datasets that are not in the public domain or covered by the repository license
have their license indicated in the same folder.
