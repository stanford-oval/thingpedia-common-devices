#!/bin/bash

set -e
set -x

./scripts/upload-all.sh \
    builtin/org.thingpedia.dialogue-handler \
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

mkdir -p tmp/entities
npx genie download-entity-values \
    --thingpedia-url https://thingpedia.stanford.edu/thingpedia \
    -d ./tmp/entities \
    --type com.yelp:restaurant_cuisine
npx genie upload-entity-values \
    --json ./tmp/entities/com.yelp:restaurant_cuisine.json \
    --entity-id com.yelp:restaurant_cuisine \
    --entity-name 'Cuisines in Yelp'
