NULL =

zipfiles = \
	com.9gag.zip \
	com.almondmarket.bikes.zip \
	com.almondmarket.dates.zip \
	com.bing.zip \
	com.bodytrace.scale.zip \
	com.dropbox.zip \
	com.facebook.zip \
	com.fitbit.zip \
	com.foaas.zip \
	com.github.zip \
	com.giphy.zip \
	com.gmail.zip \
	com.google.drive.zip \
	com.google.zip \
	com.hue.zip \
	com.imgflip.zip \
	com.instagram.zip \
	com.jawbone.up.zip \
	com.lg.tv.webos2.zip \
	com.linkedin.zip \
	com.live.onedrive.zip \
	com.nest.zip \
	com.parklonamerica.heatpad.zip \
	com.phdcomics.zip \
	com.reddit.frontpage.zip \
	com.slack.zip \
	com.tesla.zip \
	com.tesla.zip \
	com.thecatapi.zip \
	com.tumblr.zip \
	com.twilio.zip \
	com.twitter.zip \
	com.uber.zip \
	com.washingtonpost.zip \
	com.xkcd.zip \
	com.yahoo.finance.zip \
	com.yandex.translate.zip \
	com.youtube.zip \
	gov.nasa.zip \
	org.thingpedia.bluetooth.speaker.a2dp.zip \
	org.thingpedia.emailsender.zip \
	org.thingpedia.holidays.zip \
	org.thingpedia.icalendar.zip \
	org.thingpedia.rss.zip \
	org.thingpedia.test.zip \
	org.thingpedia.weather.zip \
	uk.co.thedogapi.zip \
	us.sportradar.zip


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
