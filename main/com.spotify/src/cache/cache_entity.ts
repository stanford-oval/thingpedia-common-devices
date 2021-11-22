import SpotifyEntity from "../spotify_entity";

export type DisplayFormatter = (name : string) => string;

/**
 * Cached  that we can represent as `thingpedia.Value.Entity`
 * instances.
 *
 * They must include an `id`, a `name` and a `uri`.
 */
export default abstract class CacheEntity {
    constructor(
        public type : string,
        public id : string,
        public name : string,
        public uri : string
    ) {}

    getEntity(
        formatter : DisplayFormatter,
        forceSoftmatch  = false
    ) : SpotifyEntity {
        return new SpotifyEntity(
            this.uri,
            this.name,
            formatter,
            forceSoftmatch
        );
    }

    toThing(formatter : DisplayFormatter, forceSoftmatch  = false) {
        return {
            id: this.getEntity(formatter, forceSoftmatch),
        };
    }

    toJSON() : any {
        return Object.assign({ __class__: this.constructor.name }, this);
    }
}
