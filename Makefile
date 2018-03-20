NULL =

jsonfiles := $(wildcard *.json)
zipfiles := $(jsonfiles:.json=.zip)

all: $(zipfiles)

%.zip: build/%
	cd $< ; \
	npm install --only=prod --no-optional ; \
	npm dedupe ; \
	zip -r $(abspath $@) *

build/%: %
	mkdir -p build/
	-test -d $@ && rm -fr $@
	cp -r $< $@
	touch $@

clean:
	rm -fr build/
	rm -f *.zip
