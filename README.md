# Various Thingpedia Devices

[![Build Status](https://travis-ci.com/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices.svg?branch=master)](https://travis-ci.com/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices) [![Coverage Status](https://coveralls.io/repos/github/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices/badge.svg?branch=master)](https://coveralls.io/github/Stanford-Mobisocial-IoT-Lab/thingpedia-common-devices?branch=master)

## Knowledge for your Virtual Assistant

Thingpedia is the open, crowdsourced knowledge base for virtual assistants.
Anyone can contribute the interface code to access any device or
web service to Thingpedia.

This repository contains a subset of the interfaces hosted
on Thingpedia, that are maintained by the Thingpedia authors.

These interfaces cannot be used alone: each interface must be packaged
and uploaded separately to Thingpedia, to be used by some installation
of the Almond virtual assistant.
While a package.json is present at the top of this repository, its purpose
is only to declare dependencies used in automatic testing. Directly importing
this package, or any of the Thingpedia interfaces, is likely to fail without
the necessary surrounding code.

Thingpedia is part of Almond, a research project led by
prof. Monica Lam, from Stanford University.  You can find more
information at <https://almond.stanford.edu>.

## Test your device
This repository also provides a simple test framework for devices 
that require no authentication. 

Once your device has been created, you can add the test under directory `test`. 
A couple examples have been added for your reference. 
For example, if you want to test your device named `com.xxx`, 
first create a test file `com.xxx.js` under directory `test`, 
and then run `node test/index.js com.xxx`.

If the device has not been added to Thingpedia, make sure the `manifest.tt`
contains a name and a description to pass the test. E.g.,: 
```js
class @com.xxx
#_[name="XXX"]
#_[description="YYY] {
  ... 
}
```


## Prepare the package and upload to Thingpedia
Once you are ready, you can pack your interface and submit it to Thingpedia. 
If the device only has one JavaScript file and no dependencies (i.e., `node_modules`), 
you can go ahead and upload the JavaScript file at <https://almond.stanford.edu/thingpedia/upload/create>.
Otherwise, you will need to upload a zip file containing all the files and dependencies.
You can create the zip file by running `make com.xxx.zip`.