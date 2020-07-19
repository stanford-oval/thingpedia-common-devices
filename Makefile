-include ../config.mk

NULL =

all_releases := main universe staging
# this indirection is for the purpose of [genie-k8s](https://github.com/stanford-oval/genie-k8s),
# which sets experiment=
experiment ?= main
release ?= $(experiment)

devices := $(foreach d,$(wildcard $(release)/*),$(notdir $(d)))
pkgfiles := $(wildcard $(release)/*/package.json)
zipfiles := $(pkgfiles:%/package.json=build/%.zip)

.PRECIOUS: %/node_modules
.PHONY: all clean lint

eslint = node_modules/.bin/eslint
genie = node_modules/.bin/genie
thingpedia = node_modules/.bin/thingpedia

all: $(zipfiles)
	@:

build/%.zip: % %/node_modules
	mkdir -p `dirname $@`
	cd $< ; zip -x '*.tt' '*.yml' 'node_modules/.bin/*' 'icon.png' -r $(abspath $@) .

%/node_modules: %/package.json %/yarn.lock
	mkdir -p $@
	cd `dirname $@` ; yarn --only=prod --no-optional
	touch $@

%: %/package.json %/*.js %/node_modules
	touch $@

clean:
	rm -fr build/$(release)

lint:
	for f in $(devices) ; do \
		echo $(release)/$$f ; \
		$(thingpedia) lint-device --manifest $(release)/$$f/manifest.tt --dataset $(release)/$$f/dataset.tt ; \
		test ! -f $(release)/$$f/package.json || $(eslint) $(release)/$$f/*.js ; \
	done
