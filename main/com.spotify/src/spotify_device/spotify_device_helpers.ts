import { strict as assert } from "assert";

import type { Runtime } from "thingtalk";

import { SearchKwds } from "../api/apis/search_api";
import { PageOptions } from "../api/requests";
import { SearchQuery } from "../api/search_query";
import { isTestMode, pick } from "../helpers";
import type SpotifyDevice from "./spotify_device";
import { Params, ExecWrapper } from "./types";

export function buildQuery(
    filter : Runtime.CompiledFilterHint[],
    idProp : keyof SearchQuery
) : SearchQuery {
    const query = new SearchQuery();

    for (const [name, op, value] of filter) {
        switch (name) {
        case "id":
            if (op === "==" || op === "=~")
                query[idProp] = value;

            break;
        case "artists":
            if (op === "contains" || op === "contains~")
                query.artist = value;

            break;
        case "release_date":
            if (!(value instanceof Date)) {
                console.warn(
                    `Expected release_date to be Date, ` +
                            `found ${typeof value}: ${value}`
                );
                continue;
            }
            if (op === "==")
                query.year = value;
            else if (op === ">=")
                query.minYear = value;
            else if (op === "<=")
                query.maxYear = value;

            break;
        case "genres":
            if (op === "contains" || op === "contains~")
                query.genre = value;

            break;
        case "album":
            if (op === "==" || op === "=~")
                query.album = value;

            break;
        default:
            console.warn(`Un-recognized filter name '${name}'`);
            break;
        }
    }

    return query;
}

export function invokeSearch<T>(
    hints : Runtime.CompiledQueryHints,
    idProp : keyof SearchQuery,
    searchMethod : (kwds : Omit<SearchKwds, "type">) => Promise<T[]>,
    fallbackMethod : (options : PageOptions) => Promise<T[]>,
    otherSearchKwds : Omit<SearchKwds, "query" | "type"> = {}
) : Promise<T[]> {
    if (!hints.filter)
        return fallbackMethod(pick(["limit", "offset"], otherSearchKwds));


    const query = buildQuery(hints.filter, idProp);

    if (query.isEmpty())
        return fallbackMethod(pick(["limit", "offset"], otherSearchKwds));


    return searchMethod({ query, ...otherSearchKwds });
}

// Decorators
// ===========================================================================
//
// In here since it's easiest to have them reference SpotifyDevice instead of
// defining a separate interface or creating a circular dependency (not sure
// how JS runtimes deal with that).
//

export function genieGet(
    target : any,
    propertyKey : string,
    descriptor : PropertyDescriptor
) {
    const fn = descriptor.value;

    assert(
        typeof fn === "function",
        `genieGet() can only decorate functions, given ${typeof fn}: ${fn}`
    );

    descriptor.value = async function(
        this : SpotifyDevice,
        params : Params,
        hints : Runtime.CompiledQueryHints,
        env : ExecWrapper
    ) {
        const log = this.log.childFor(fn, {
            "request.type": "genie.get",
            "state.id": this.state.id,
            // HACK This _should_ always be there, but the change has not been
            //      pushed through yet (2021-10-28)
            "env.app.uniqueId": env?.app?.uniqueId,
            params,
            hints,
        });
        const proxy = new Proxy(this, {
            get(target, prop, receiver) {
                if (prop === "log")
                    return log;

                return Reflect.get(target, prop, receiver);
            },
        });
        log.debug("Start Genie GET request");
        const profiler = log.startTimer();
        let response : ReturnType<typeof fn>;
        try {
            response = await fn.call(proxy, params, hints, env);
        } catch(error : any) {
            this._handleError(profiler, error);
        }

        if (!Array.isArray(response)) {
            log.warn("Genie GET request do not return an Array, wrapping.", {
                response,
            });
            response = [response];
        }

        profiler.done({
            level: "info",
            message: "Genie GET request complete.",
            response,
        });
        return response;
    };
}

export function genieDo(
    target : any,
    propertyKey : string,
    descriptor : PropertyDescriptor
) {
    const fn = descriptor.value;

    assert(
        typeof fn === "function",
        `genieDo() can only decorate functions, given ${typeof fn}: ${fn}`
    );

    descriptor.value = async function(
        this : SpotifyDevice,
        params : Params,
        env : ExecWrapper
    ) {
        const log = this.log.childFor(fn, {
            "request.type": "genie.do",
            "env.app.uniqueId": env.app.uniqueId,
            params,
        });
        if (isTestMode()) {
            log.debug("In test mode, aborting.");
            return undefined;
        }
        log.debug("Start Genie DO request");
        const proxy = new Proxy(this, {
            get(target, prop, receiver) {
                if (prop === "log")
                    return log;

                return Reflect.get(target, prop, receiver);
            },
        });
        const profiler = log.startTimer();
        let response : ReturnType<typeof fn>;
        try {
            response = await fn.call(proxy, params, env);
        } catch(error : any) {
            this._handleError(profiler, error);
        }
        profiler.done({
            level: "info",
            message: "Genie DO request complete.",
            response,
        });
        return response;
    };
}
