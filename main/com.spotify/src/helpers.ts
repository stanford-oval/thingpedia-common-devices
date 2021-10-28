import { strict as assert } from "assert";
import { Value } from "thingpedia";
import { RedisClientType } from "redis/dist/lib/client";

import { SimplifiedEpisodeObject } from "./api/objects";
import { MarketPageOptions, PageOptions } from "./api/requests";
import { ThingPlayable } from "./things";

export type URIType =
    | "track"
    | "artist"
    | "album"
    | "playlist"
    | "show"
    | "episode";

export const URI_TYPES: URIType[] = [
    "track",
    "artist",
    "album",
    "playlist",
    "show",
    "episode",
];

/**
 * Here to provide centralized indirection for how we typing Redis clients.
 *
 * There's some confusion/complexity with how to type Redis clients...
 * `RedisClientType` is not root exported, and it is parameterized in a way that
 * I haven't had the time to try and sort out.
 *
 * The strait-forward alternative — using the return type of
 * `Redis.createClient` — has typing issues. As of writing we are using a
 * pre-release version of the Redis client that uses a promise API and provides
 * better typing. Assuming this will get sorted out by the `redis` package
 * authors by the time there is a regular release.
 */
export type RedisClient = RedisClientType;

// Helper Functions
// ===========================================================================

export function pick<
    TObject extends Record<string, unknown>,
    TKeys extends keyof TObject
>(keys: TKeys[], record: TObject): Pick<TObject, TKeys> {
    const out: any = {};
    for (const key of keys) {
        out[key] = record[key];
    }
    return out;
}

export function sample<T>(items: T[]): T;
export function sample<T>(items: T[], n: number): T[];
export function sample<T>(items: T[], n?: number) {
    if (n === undefined) {
        return items[Math.floor(Math.random() * items.length)];
    }
    const result: T[] = [];
    const workCopy: T[] = Array.from(items);
    while (result.length < n) {
        // Pick a random index
        const index = Math.floor(Math.random() * workCopy.length);
        // Add that item to the result
        result.push(workCopy[index]);
        // Put the first item into it's place (if needed)
        if (index !== 0) {
            workCopy[index] = workCopy[0];
        }
        // Drop the first element
        workCopy.shift();
    }
    return result;
}

export function uriType(uri: string): URIType {
    for (const type of URI_TYPES) {
        if (uri.startsWith(`spotify:${type}`)) {
            return type;
        }
    }
    throw new Error(`Not a recognized URI type: ${uri}`);
}

export function isSingularURI(uri: string): boolean {
    const type = uriType(uri);
    return type === "track" || type === "episode";
}

export function uriId(uri: string): string {
    const parts = uri.split(":");
    return parts[parts.length - 1];
}

export function arrayFor<TItem>(arrayOrItem: TItem | TItem[]): TItem[] {
    if (Array.isArray(arrayOrItem)) {
        return arrayOrItem;
    }
    return [arrayOrItem];
}

// Assertion Helper Functions
// ---------------------------------------------------------------------------

export function assertMin(name: string, value: number, min: number): void {
    assert(value >= min, `Expected ${name} ≥ ${min}, given ${name} = ${value}`);
}

export function assertMax(name: string, value: number, max: number): void {
    assert(value <= max, `Expected ${name} ≤ ${max}, given ${name} = ${value}`);
}

export function assertBounds(
    name: string,
    value: number,
    min: number,
    max: number
): void {
    assert(
        min <= value && value <= max,
        `Expected ${min} ≤ ${name} ≤ ${max}, given ${name} = ${value}`
    );
}

export function assertUnreachable(): never {
    assert(false, "Expected to be unreachable");
}

export function checkPageOptions(
    options: PageOptions,
    {
        min = 1,
        max = 50,
    }: {
        min?: number;
        max?: number;
    } = {}
): void {
    if (options.limit !== undefined) {
        assertBounds("options.limit", options.limit, min, max);
    }
    if (options.offset !== undefined) {
        assertMin("options.offset", options.offset, 0);
    }
}

export type IsFn<T> = (x: any) => x is T;

export function cast<T>(is: IsFn<T>, x: any, message?: string): T {
    if (is(x)) {
        return x;
    }
    if (message === undefined) {
        message = `Expected ${is.name} to return true`;
    }
    throw new TypeError(`message; given ${typeof x}: ${x}`);
}

export function isString(x: any): x is string {
    return typeof x === "string";
}

export function checkEntity(name: string, x: any): Value.Entity {
    if (typeof x === "object" && x instanceof Value.Entity) {
        return x;
    }
    throw new TypeError(
        `Expected ${name} to be an Entity, given ${typeof x}: ${x}`
    );
}

export function defaultFromToken(
    options: MarketPageOptions
): MarketPageOptions {
    if (options.market === undefined) {
        return { ...options, market: "from_token" };
    }
    return options;
}

// Functions Copied/Adapted From Skill
// ---------------------------------------------------------------------------
//
// Used to be in `thingpedia-common-devices/main/com.spotify/index.js`, see
//
// https://github.com/stanford-oval/thingpedia-common-devices/blob/4c20248f87d000be1aef906d34b74a820aa03788/main/com.spotify/index.js
//

export function isUnfinished(episode: SimplifiedEpisodeObject): boolean {
    return !episode?.resume_point?.fully_played;
}

export function isTestMode(): boolean {
    return process.env.TEST_MODE === "1";
}

export function entityMatchScore(
    searchTerm: string,
    candidate: string
): number {
    if (searchTerm === candidate) return 1000;

    candidate = removeParenthesis(candidate);
    searchTerm = removeParenthesis(searchTerm);
    let searchTermTokens = searchTerm.split(" ");

    let score = 0;
    score -= 0.1 * editDistance(searchTerm, candidate);

    const candidateTokens = new Set(candidate.split(" "));

    for (let candidateToken of candidateTokens) {
        let found = false;
        for (let token of searchTermTokens) {
            if (
                token === candidateToken ||
                (editDistance(token, candidateToken) <= 1 && token.length > 1)
            ) {
                score += 10;
                found = true;
            } else if (candidateToken.startsWith(token)) {
                score += 0.5;
            }
        }

        // give a small boost to ignorable tokens that are missing
        // this offsets the char-level edit distance
        if (
            !found &&
            ["the", "hotel", "house", "restaurant"].includes(candidateToken)
        )
            score += 0.1 * candidateToken.length;
    }

    return score;
}

function removeParenthesis(str: string): string {
    return str.replace(/ \(.*?\)/g, "");
}

function extractSongName(str: string): string {
    str = removeParenthesis(str);
    str = str.split(" - ")[0];
    return str;
}

// removes duplicate remixes/editions
//
// TODO Fix this up
//
export function filterPlayables(playables: ThingPlayable[]): ThingPlayable[] {
    const names: Set<string> = new Set();
    const filteredPlayables = Array.from(
        new Set(playables.map((playable) => String(playable.id.display)))
    )
        .filter((name) => {
            if (!names.has(extractSongName(name))) {
                names.add(extractSongName(name));
                return true;
            }
            return false;
        })
        .map((name) => {
            return playables.find((playable) => playable.id.display === name);
        });
    return filteredPlayables as ThingPlayable[];
}

function editDistance(one: string, two: string): number {
    if (one === two) return 0;
    if (one.indexOf(two) >= 0) return one.length - two.length;
    if (two.indexOf(one) >= 0) return two.length - one.length;

    const R = one.length + 1;
    const C = two.length + 1;
    const matrix: number[] = new Array(R * C);

    function set(i: number, j: number, v: number) {
        // assert(i * C + j < R * C);
        matrix[i * C + j] = v;
    }

    function get(i: number, j: number): number {
        // assert(i * C + j < R * C);
        return matrix[i * C + j];
    }

    for (let j = 0; j < C; j++) set(0, j, j);
    for (let i = 1; i < R; i++) set(i, 0, i);
    for (let i = 1; i <= one.length; i++) {
        for (let j = 1; j <= two.length; j++) {
            if (one[i - 1] === two[j - 1]) set(i, j, get(i - 1, j - 1));
            else
                set(
                    i,
                    j,
                    1 +
                        Math.min(
                            Math.min(get(i - 1, j), get(i, j - 1)),
                            get(i - 1, j - 1)
                        )
                );
        }
    }

    return get(one.length, two.length);
}
