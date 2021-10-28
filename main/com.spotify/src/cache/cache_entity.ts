import { Value } from "thingpedia";

export type DisplayFormatter = (name: string) => string;

/**
 * Cached  that we can represent as `thingpedia.Value.Entity`
 * instances.
 *
 * They must include an `id`, a `name` and a `uri`.
 */
export default abstract class CacheEntity {
    constructor(
        public type: string,
        public id: string,
        public name: string,
        public uri: string
    ) {}

    entity(formatter?: DisplayFormatter): Value.Entity {
        const name = formatter === undefined ? this.name : formatter(this.name);
        return new Value.Entity(this.uri, name);
    }

    toThing(formatter: DisplayFormatter) {
        return {
            id: this.entity(formatter),
        };
    }

    toJSON(): any {
        return Object.assign({ __class__: this.constructor.name }, this);
    }
}
