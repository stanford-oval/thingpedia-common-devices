import { URL, URLSearchParams } from "url";

import { Helpers } from "thingpedia";
import { Logger } from "@stanford-oval/logging";

import Logging from "../logging";
import { ThingError } from "../things";

// Constants
// ===========================================================================

const LOG = Logging.get(__filename);

// Types
// ===========================================================================

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

// Class Definition
// ===========================================================================

export default class Http {
    private static readonly LOG = LOG.childFor(Http);

    useOAuth2: Helpers.Http.HTTPRequestOptions["useOAuth2"];
    urlBase: string;

    constructor({
        useOAuth2,
        urlBase,
    }: {
        useOAuth2: Helpers.Http.HTTPRequestOptions["useOAuth2"];
        urlBase: string;
    }) {
        this.useOAuth2 = useOAuth2;
        this.urlBase = urlBase;
    }

    private get log(): Logger.TLogger {
        return Http.LOG;
    }

    makeURL(path: string, query?: Record<string, any>): URL {
        const url = new URL(path, this.urlBase);
        if (query !== undefined) {
            const searchQueryObj: Record<string, string> = {};
            for (const [key, value] of Object.entries(query)) {
                if (value !== undefined && value !== null) {
                    if (value instanceof Date) {
                        searchQueryObj[key] = value.toISOString();
                    } else {
                        searchQueryObj[key] = String(value);
                    }
                }
            }
            url.search = String(new URLSearchParams(searchQueryObj));
        }
        return url;
    }

    private handleHTTPError(error: Helpers.Http.HTTPError): never {
        switch (error.code) {
            case 429:
                throw new ThingError(`Too many requests`, "rate_limit_error");
            default:
                if (!error.detail) throw error;
                let detail: any = undefined;
                try {
                    detail = JSON.parse(error.detail);
                } catch (parseError) {}
                const message = detail?.error?.message;
                if (message) {
                    throw new ThingError(String(message), `http_${error.code}`);
                } else {
                    throw new ThingError(
                        `HTTP ${error.code} Error`,
                        `http_${error.code}`
                    );
                }
        }
    }

    private handleHTTPFailure(reason: any): never {
        if (reason instanceof Helpers.Http.HTTPError) {
            this.handleHTTPError(reason);
        }
        throw new Error(`Unknown HTTP Error, reason: ${reason}`);
    }

    async request<TResponse = any>({
        method,
        path,
        query,
        body,
    }: {
        method: HTTPMethod;
        path: string;
        query?: Record<string, any>;
        body?: Record<string, any>;
    }): Promise<TResponse> {
        const log = this.log.childFor(this.request, {
            method,
            path,
            query,
            body,
        });
        const url = this.makeURL(path, query);

        const options: Helpers.Http.HTTPRequestOptions = {
            useOAuth2: this.useOAuth2,
            accept: "application/json",
        };

        let encodedBody: null | string = null;
        if (body !== undefined) {
            options.dataContentType = "application/json";
            try {
                encodedBody = JSON.stringify(body);
            } catch (error: any) {
                log.error("Failed to JSON encode request body --", error);
                throw error;
            }
            // Don't send empty JSON objects (happens when _all_ properties of
            // `body` are `undefined`)
            if (encodedBody === "{}") {
                encodedBody = null;
            }
        }

        let response: string;
        const timer = log.startTimer();

        try {
            response = await Helpers.Http.request(
                url.href,
                method,
                encodedBody,
                options
            );
        } catch (reason: any) {
            const status = reason?.code || 600; // 600 means ???
            timer.done({ level: "http", status });
            this.handleHTTPFailure(reason);
        }

        timer.done({ level: "http" });

        if (response === "") {
            return undefined as any as TResponse;
        }

        try {
            return JSON.parse(response) as TResponse;
        } catch (error: any) {
            log.error("Failed to JSON parse response --", error);
            throw error;
        }
    }

    get<TResponse = any>(
        path: string,
        query?: Record<string, any>
    ): Promise<TResponse> {
        return this.request<TResponse>({ method: "GET", path, query });
    }

    /**
     * Make a GET request that returns a "list response" -- an object with a
     * _single_ key that's value is the array of results -- and automatically
     * extract that array of results.
     *
     * The "list response" is a common response pattern; things like:
     *
     *      {artists: ArtistObject[]}
     *      {audio_features: AudioFeatureObject[]}
     *
     * It works by typing the "list response" as `Record<string, TItem[]>`, then
     * returning the value of the first key.
     *
     * @param path
     * @param query
     * @returns
     */
    getList<TItem>(
        path: string,
        query?: Record<string, any>
    ): Promise<TItem[]> {
        return this.get<Record<string, TItem[]>>(path, query).then((r) => {
            return r[Object.keys(r)[0]];
        });
    }

    post<TResponse = any>(
        path: string,
        body: Record<string, any>
    ): Promise<TResponse> {
        return this.request<TResponse>({ method: "POST", path, body });
    }

    put<TResponse = any>(
        path: string,
        body: Record<string, any>
    ): Promise<TResponse> {
        return this.request<TResponse>({ method: "PUT", path, body });
    }
}
