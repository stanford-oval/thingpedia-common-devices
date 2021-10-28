import { Value } from "thingpedia";
import { Logger } from "@stanford-oval/logging";

import { DeviceObject } from "../api/objects";
import { assertUnreachable, isSingularURI, uriType } from "../helpers";
import Logging from "../logging";

export type URIResolver = (uri: string) => Promise<string[]>;

type NextValue = {
    done: false;
    value: string;
};

type NextDone = {
    done: true;
};

const LOG = Logging.get(__filename);

export default class QueueBuilder {
    private static readonly log = LOG.childFor(QueueBuilder);

    public readonly appId: string;
    public readonly device;
    public srcURIs: string[];

    private _destURIs: string[];
    private _resolver: URIResolver;
    private _canceled: boolean;

    constructor(appId: string, device: DeviceObject, resolver: URIResolver) {
        this.appId = appId;
        this.device = device;
        this.srcURIs = [];

        this._destURIs = [];
        this._resolver = resolver;
        this._canceled = false;
    }

    private get log(): Logger.TLogger {
        return QueueBuilder.log;
    }

    get deviceEntity(): Value.Entity {
        return new Value.Entity(this.device.id, this.device.name);
    }

    get isEmpty(): boolean {
        return this.srcURIs.length === 0;
    }

    async popInitialURIs(): Promise<string[]> {
        const log = this.log.childFor(this.popInitialURIs, {
            appId: this.appId,
        });

        if (this.isEmpty) {
            log.error("Attempting to pop initial URIs from empty QueueBuilder");
            return [];
        }

        const readyURIs: string[] = [];
        while (this.srcURIs.length > 0 && isSingularURI(this.srcURIs[0])) {
            readyURIs.push(this.srcURIs[0]);
            this.srcURIs.shift();
        }

        if (readyURIs.length > 0) {
            log.debug(
                `Found ${readyURIs.length} initial ready URIs, returning.`,
                {
                    readyURIs,
                    remainingSrcURIs: this.srcURIs.length,
                }
            );
            return readyURIs;
        }

        const srcURI = this.srcURIs.shift();

        if (srcURI === undefined) {
            assertUnreachable();
        }

        log.debug("No initial ready URIs found, resolving first src URI...", {
            srcURI,
        });

        const destURIs = await this._resolver(srcURI);

        log.debug("Resolved first URI, returning.", { srcURI, destURIs });

        return destURIs;
    }

    push(entity: Value.Entity): void {
        this.srcURIs.push(entity.value);
    }

    cancel() {
        this._canceled = true;
    }

    async next(): Promise<NextValue | NextDone> {
        const log = this.log.childFor(this.next, { appId: this.appId });
        log.debug("Getting next destination URI...", {
            srcURIs: this.srcURIs,
            destURIs: this._destURIs,
        });

        if (this._canceled) {
            log.debug("Canceled, done.");
            return { done: true };
        }

        const destURI = this._destURIs.shift();
        if (destURI !== undefined) {
            log.debug("Returning next destination URI", { uri: destURI });
            return { done: false, value: destURI };
        }

        const srcURI = this.srcURIs.shift();
        if (srcURI === undefined) {
            log.debug("No more source URIs, done.");
            return { done: true };
        }

        const srcURIType = uriType(srcURI);
        if (srcURIType === "track" || srcURIType === "episode") {
            log.debug("Next source URI is a track or episode, returning", {
                uri: srcURI,
            });
            return { done: false, value: srcURI };
        }

        log.debug("Need to resolve next source URI", {
            uri: srcURI,
        });
        this._destURIs = await this._resolver(srcURI);
        log.debug("Resolved, looping again...", {
            src: srcURI,
            dest: this._destURIs,
        });
        return await this.next();
    }

    [Symbol.asyncIterator]() {
        return this;
    }
}
