NULL =

zipfiles = \
	uk.co.thedogapi.zip \
	com.tesla.zip \
	com.fitbit.zip \
	com.twitter.zip \
	com.bodytrace.scale.zip \
	com.parklonamerica.heatpad.zip \
	us.sportradar.zip \
	org.thingpedia.weather.zip \
	org.thingpedia.test.zip \
	com.facebook.zip \
	com.google.zip \
	com.google.drive.zip \
	com.jawbone.up.zip \
	com.twilio.zip \
	com.foaas.zip \
	com.nest.zip \
	com.tesla.zip \
	com.9gag.zip \
	com.slack.zip \
	org.thingpedia.bluetooth.speaker.a2dp.zip \
	com.bing.zip \
	com.thecatapi.zip \
	org.thingpedia.emailsender.zip \
	com.github.zip \
	com.linkedin.zip \
	com.xkcd.zip \
	com.uber.zip \
	com.yandex.translate.zip \
	com.yahoo.finance.zip \
	org.thingpedia.rss.zip \
	com.youtube.zip \
	com.instagram.zip \
	com.live.onedrive.zip \
	com.hue.zip \
	org.thingpedia.icalendar.zip \
	org.thingpedia.holidays.zip \
	com.dropbox.zip \
	com.imgflip.zip \
	com.gmail.zip \
	com.phdcomics.zip \
	gov.nasa.zip \
	com.tumblr.zip \
	com.reddit.frontpage.zip \
	com.lg.tv.webos2.zip \
	com.washingtonpost.zip \
	com.almondmarket.bikes.zip \
	com.almondmarket.dates.zip

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
