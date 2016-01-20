zipfiles = \
	bluetooth-generic.zip \
	twitter-account.zip \
	bodytrace-scale.zip \
	heatpad.zip \
	sportradar.zip \
	weather.zip \
	test.zip

all: $(zipfiles)

%.zip: %
	cd $< ; \
	npm install ; \
	zip -r $(abspath $@) *

upload: $(zipfiles)
	#scp $^ pepperjack.stanford.edu:/home/ThingPedia/code_storage/devices/
	for f in $^ ; do \
	version=`./extract-version.js $$f` ; \
	aws s3 cp $$f s3://thingpedia/devices/`basename -s .zip $$f`-v$${version}.zip ; \
	done

clean:
	rm -f *.zip
