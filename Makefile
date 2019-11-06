NULL =

pkgfiles := $(wildcard */package.json)
zipfiles := $(pkgfiles:%/package.json=%.zip)

.PRECIOUS: %/node_modules

all: $(zipfiles)
	@:

%.zip: % %/node_modules
	cd $< ; zip -x '*.tt' '*.yml' 'node_modules/.bin/*' 'icon.png' -r $(abspath $@) .

%/node_modules: %/package.json %/yarn.lock
	mkdir -p $@
	cd `dirname $@` ; yarn --only=prod --no-optional
	touch $@

%: %/package.json %/*.js %/node_modules
	touch $@

clean:
	rm -f *.zip

lint:
	for f in */package.json ; do \
		echo $$f ; \
		eslint `dirname $$f`/*.js || exit 1 ; \
	done
