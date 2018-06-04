"use strict";

const Tp = require('thingpedia');

const URL = 'https://westus.api.cognitive.microsoft.com/vision/v2.0/describe?maxCandidates=1&language=en';

module.exports = class MSComputerVision extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = this.kind;
        this.name = this.constructor.metadata.name;
        this.description = this.constructor.metadata.description;
    }
    
    get_generate_description({ picture_url }) {
        return Tp.Helpers.Content.getStream(this.engine.platform, picture_url).then((stream) => {
            return Tp.Helpers.Http.postStream(URL, stream, { dataContentType: 'application/octet-stream',
                                                             extraHeaders: { 
                                                                 'Ocp-Apim-Subscription-Key': this.constructor.metadata.auth.api_key
                                                             } });
        }).then((result) => {
            const parsed = JSON.parse(result);
            if (parsed.description.captions.length === 0)
                throw new Error('Failed to generate a description for the image');
            return [{ description: parsed.description.captions[0].text }];
        });
    }
};
