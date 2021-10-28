import type { Runtime } from "thingtalk";
import { SearchKwds } from "../api/apis/search_api";
import { PageOptions } from "../api/requests";
import { SearchQuery } from "../api/search_query";
import { pick } from "../helpers";

export function buildQuery(
    filter: Runtime.CompiledFilterHint[],
    idProp: keyof SearchQuery
): SearchQuery {
    const query = new SearchQuery();

    for (let [name, op, value] of filter) {
        switch (name) {
            case "id":
                if (op === "==" || op === "=~") {
                    query[idProp] = value;
                }
                break;
            case "artists":
                if (op === "contains" || op === "contains~") {
                    query.artist = value;
                }
                break;
            case "release_date":
                if (!(value instanceof Date)) {
                    console.warn(
                        `Expected release_date to be Date, ` +
                            `found ${typeof value}: ${value}`
                    );
                    continue;
                }
                if (op === "==") {
                    query.year = value;
                } else if (op === ">=") {
                    query.minYear = value;
                } else if (op === "<=") {
                    query.maxYear = value;
                }
                break;
            case "genres":
                if (op === "contains" || op === "contains~") {
                    query.genre = value;
                }
                break;
            case "album":
                if (op === "==" || op === "=~") {
                    query.album = value;
                }
                break;
            default:
                console.warn(`Un-recognized filter name '${name}'`);
                break;
        }
    }

    return query;
}

export function invokeSearch<T>(
    hints: Runtime.CompiledQueryHints,
    idProp: keyof SearchQuery,
    searchMethod: (kwds: Omit<SearchKwds, "type">) => Promise<T[]>,
    fallbackMethod: (options: PageOptions) => Promise<T[]>,
    otherSearchKwds: Omit<SearchKwds, "query" | "type"> = {}
): Promise<T[]> {
    if (!hints.filter) {
        return fallbackMethod(pick(["limit", "offset"], otherSearchKwds));
    }

    const query = buildQuery(hints.filter, idProp);

    if (query.isEmpty()) {
        return fallbackMethod(pick(["limit", "offset"], otherSearchKwds));
    }

    return searchMethod({ query, ...otherSearchKwds });
}
