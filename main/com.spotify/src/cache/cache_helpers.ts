import { strict as assert } from "assert";
import { Logger } from "@stanford-oval/logging";

import Logging from "../logging";
import { RedisClient } from "../helpers";

const LOG = Logging.get(__filename);
const REGISTRY: Record<string, any> = {};

export const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 1 day

export interface CacheDecorated {
    log: Logger.TLogger;
    redis: RedisClient | undefined;
    userId: string;
}

export function cacheRegister(cls: any) {
    REGISTRY[cls.name] = cls;
}

export function orderedPairsFor(
    record: Record<string, any>,
    omit: string[] = []
): Array<[string, any]> {
    const pairs: Array<[string, any]> = [];
    for (const key of Object.keys(record).sort()) {
        if (!omit.includes(key)) {
            const value = record[key];
            if (value !== undefined) pairs.push([key, value]);
        }
    }
    return pairs;
}

export function cacheReviver(key: string, value: any) {
    const log = LOG.childFor(cacheReviver);
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (!value.hasOwnProperty("__class__")) {
        return value;
    }
    const className = value.__class__;
    log.debug(`Reviving...`, { __class__: className });
    if (typeof className !== "string") {
        log.warn("Extracted __class__ is not a string! Returning `value`.", {
            __class__: className,
            value,
        });
        return value;
    }
    const cls = REGISTRY[className];
    if (cls === undefined) {
        log.warn("Failed to find __class__ in REGISTRY, returning `value`", {
            __class__: className,
            availableClasses: Object.keys(REGISTRY),
            value,
        });
        return value;
    }

    return new cls(value);
}

export async function cacheGet(
    redis: undefined | RedisClient,
    key: string,
    log?: Logger.TLogger
): Promise<null | string> {
    if (!redis || !redis.isOpen) {
        return null;
    }
    if (log === undefined) {
        log = LOG.childFor(cacheSet);
    }
    const cached = await redis.GET(key);
    if (cached === null) {
        log.info("CACHE MISS", {key});
    } else {
        log.info("CACHE HIT", {key});
    }
    return cached;
}

export async function cacheSet(
    redis: undefined | RedisClient,
    key: string,
    data: string,
    options: any,
    log?: Logger.TLogger
) {
    if (!redis || !redis.isOpen) {
        return null;
    }
    if (log === undefined) {
        log = LOG.childFor(cacheSet);
    }
    log.info("CACHE SET", { key, options: options });
    await redis.SET(key, data, options);
}

export function cache<TArgs extends any[]>(
    makeArgsKey: null | ((...args: TArgs) => undefined | string),
    setOptions: any = { EX: DEFAULT_TTL_SECONDS }
) {
    return function (
        target: Object,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const fn = descriptor.value;

        assert(
            typeof fn === "function",
            `cache() can only decorate functions, given ${typeof fn}: ${fn}`
        );

        descriptor.value = async function (
            this: CacheDecorated,
            ...args: TArgs
        ) {
            const log = this.log.childFor(fn, { userId: this.userId });
            log.debug("START client cache request...", { args });

            // Identifies the function by (class.name, function.name)
            const fnKey = `${this.constructor.name}.${fn.name}`;
            let key = `com.spotify:${this.userId}:${fnKey}`;
            if (makeArgsKey !== null) {
                const argsKey = makeArgsKey.apply(this, args);
                if (argsKey !== undefined) {
                    key = `${key}:${makeArgsKey.apply(this, args)}`;
                }
            }

            let data: any;
            let isFromCache: boolean = false;

            const timer = log.startTimer();
            const cached = await cacheGet(this.redis, key);

            if (cached === null) {
                data = await fn.apply(this, args);
                cacheSet(this.redis, key, JSON.stringify(data), setOptions);
            } else {
                isFromCache = true;
                data = JSON.parse(cached, cacheReviver);
            }
            timer.done({
                level: "info",
                message: "DONE client cache request.",
                cached: isFromCache,
            });
            return data;
        };
    };
}

export function idKey(id: string): string {
    return id;
}
