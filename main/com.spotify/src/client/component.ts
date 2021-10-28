import * as Path from "path";

import { Logger } from "@stanford-oval/logging";

import Api from "../api";
import { Client, Augment } from ".";
import { RedisClient } from "../helpers";
import Logging from "../logging";

export class Component {
    public readonly log: Logger.TLogger;
    protected readonly _client: Client;

    constructor(client: Client) {
        this._client = client;
        this.log = Logging.get(
            Path.join(
                __dirname,
                "components",
                this.constructor.name.toLowerCase()
            )
        ).childFor(this.constructor);
        this.log.debug("Constructed!!!");
    }

    protected get _api(): Api {
        return this._client.api;
    }

    protected get augment(): Augment {
        return this._client.augment;
    }

    protected get redis(): RedisClient {
        return this._client.redis;
    }

    protected get userId(): string {
        return this._client.userId;
    }
}
