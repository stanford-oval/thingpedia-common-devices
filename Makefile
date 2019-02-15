NULL =

pkgfiles := $(wildcard */package.json)
zipfiles := $(ttfiles:%/package.json=%.zip)

.PRECIOUS: %/node_modules

all: $(zipfiles)
	@:

%.zip: %
	cd $< ; zip -x '*.tt' '*.yml' 'node_modules/.bin/*' -r $(abspath $@) .

%/node_modules: %/package.json %/yarn.lock
	cd `dirname $@` ; yarn --only=prod --no-optional
	# unfortunately too many devices are old and dirty
	# and fail, so we run with - to ignore the return value
	-cd `dirname $@` ; eslint *.js
	touch $@

%: %/package.json %/*.js %/node_modules
	touch $@

clean:
	rm -f *.zip
