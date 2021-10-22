#!/bin/bash

set -e
set -x

./scripts/upload-all.sh \
    builtin/org.thingpedia.dialogue-handler \
    builtin/org.thingpedia.volume-control \
    main/org.thingpedia.weather \
    main/com.bing \
    main/com.icanhazdadjoke \
    main/com.smartnews \
    main/com.yelp \
    main/org.thingpedia.media-source \
    main/org.thingpedia.media-player \
    main/com.spotify \
    main/org.thingpedia.iot.switch \
    main/org.thingpedia.iot.* \
    main/io.home-assistant \
    main/com.tunein

npx genie upload-entity-values \
    --json ./main/com.yelp/cuisines.json \
    --entity-id com.yelp:restaurant_cuisine \
    --entity-name 'Cuisines in Yelp'
