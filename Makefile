NULL =

jsonfiles := $(filter-out package.json,$(wildcard *.json))
zipfiles := $(jsonfiles:.json=.zip)

.PRECIOUS: build/%

all: $(zipfiles)

%.zip: build/%
	cd $< ; zip -r $(abspath $@) *

build/%: %
	mkdir -p build/
	-test -d $@ && rm -fr $@
	cp -r $< $@
	cd $@ ; yarn --only=prod --no-optional
	# unfortunately too many devices are old and dirty
	# and fail, so we run with - to ignore the return value
	-cd $@ ; eslint *.js
	touch $@

clean:
	rm -fr build/
	rm -f *.zip
