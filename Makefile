zipfiles = \
	org.thingpedia.bluetooth.generic.zip \
	com.twitter.zip \
	com.bodytrace.scale.zip \
	com.parklonamerica.heatpad.zip \
	us.sportradar.zip \
	yr.no.weather.zip \
	org.thingpedia.test.zip \
	com.facebook.zip \
	com.google.zip \
	com.jawbone.up.zip \
	com.twilio.zip \
	com.foaas.zip \
	com.nest.zip

all: $(zipfiles)

%.zip: %
	cd $< ; \
	npm install --only=prod --no-optional ; \
	npm dedupe ; \
	zip -r $(abspath $@) *

clean:
	rm -f *.zip
