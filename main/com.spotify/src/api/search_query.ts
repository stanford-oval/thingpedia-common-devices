import { Value } from "thingpedia";

export type YearRange = [undefined | number, undefined | number];

export type SearchQueryProps = {
    album?: string | Value.Entity;
    any?: string | Value.Entity;
    artist?: string | Value.Entity;
    genre?: string;
    tag?: string;
    track?: string | Value.Entity;
    year?: string | number | Date | YearRange;
};

function stringFor(value: any): undefined | string {
    if (value === undefined) {
        return undefined;
    }
    const valueType = typeof value;
    if (valueType !== "string") {
        console.warn(`Converting unexpected ${valueType} to string: ${value}`);
        value = String(value);
    }
    if (value === "") {
        console.warn(`Empty string is not valid, returning undefined`);
        return undefined;
    }
    return value;
}

function stringOrEntityFor(value: any): undefined | string | Value.Entity {
    if (value instanceof Value.Entity) {
        return value;
    }
    return stringFor(value);
}

function yearNumberFor(value: any): undefined | number {
    if (value === undefined) {
        // Pass-through undefined, which is equivalent to un-setting a property
        return undefined;
    }
    if (value instanceof Date) {
        return value.getFullYear();
    }
    const number = Number(value);
    if (Number.isNaN(number)) {
        console.warn(`Value ${value} is not a number (NaN)`);
        return undefined;
    }
    if (!Number.isInteger(number)) {
        console.warn(`Value ${value} -> ${number} is not an integer`);
        return undefined;
    }
    if (number < 1) {
        console.warn(`Value ${value} -> ${number} is not positive`);
        return undefined;
    }
    return number;
}

function yearFor(value: any): undefined | string | number | YearRange {
    if (value === undefined) {
        // Pass-through undefined, which is equivalent to un-setting a property
        return undefined;
    }
    if (typeof value === "string") {
        // Pass-through strings, allowing year ranges to be provided like
        // "2010-2020", though you're on your own to get it right -- we don't
        // validate
        return value;
    }
    if (value instanceof Date) {
        return value.getFullYear();
    }
    if (Array.isArray(value)) {
        if (value.length !== 2) {
            console.warn(
                `Year range arrays must have exactly 2 elements, found ${value}`
            );
            return undefined;
        }
        return [yearNumberFor(value[0]), yearNumberFor(value[1])];
    }
    return yearNumberFor(value);
}

function encodeYear(
    year: undefined | string | number | YearRange
): undefined | string {
    if (year === undefined) {
        return undefined;
    }
    if (Array.isArray(year)) {
        const min = year[0] === undefined ? 0 : year[0];
        const max = year[1] === undefined ? new Date().getFullYear() : year[1];
        return `${min}-${max}`;
    }
    if (typeof year === "string") {
        return year;
    }
    return String(year);
}

export class SearchQuery {
    public static normalize(value: any): string {
        if (value === undefined) {
            return "";
        } else if (value instanceof Value.Entity) {
            value = value.display;
        } else if (typeof value !== "string") {
            value = String(value);
        }
        return value.toLocaleLowerCase();
    }

    public static from(value: SearchQueryProps | SearchQuery) {
        if (value instanceof SearchQuery) {
            return value;
        }
        return new SearchQuery(value);
    }

    private _album?: string | Value.Entity;
    private _any?: string | Value.Entity;
    private _artist?: string | Value.Entity;
    private _genre?: string;
    private _tag?: string;
    private _track?: string | Value.Entity;
    private _year?: string | number | YearRange;

    constructor({
        album,
        any,
        artist,
        genre,
        tag,
        track,
        year,
    }: SearchQueryProps = {}) {
        this.album = album;
        this.any = any;
        this.artist = artist;
        this.genre = genre;
        this.tag = tag;
        this.track = track;
        this.year = year;
    }

    get album() {
        return this._album;
    }

    get any() {
        return this._any;
    }

    get artist() {
        return this._artist;
    }

    get genre() {
        return this._genre;
    }

    get tag() {
        return this._tag;
    }

    get track() {
        return this._track;
    }

    get year() {
        return this._year;
    }

    set album(value: any) {
        this._album = stringOrEntityFor(value);
    }

    set any(value: any) {
        this._any = stringOrEntityFor(value);
    }

    set artist(value: any) {
        this._artist = stringOrEntityFor(value);
    }

    set genre(value: any) {
        this._genre = stringFor(value);
    }

    set tag(value: any) {
        this._tag = stringFor(value);
    }

    set track(value: any) {
        this._track = stringOrEntityFor(value);
    }

    set year(value: any) {
        this._year = yearFor(value);
    }

    set minYear(value: any) {
        if (!Array.isArray(this._year)) {
            this._year = [undefined, undefined];
        }
        this._year[0] = yearNumberFor(value);
    }

    set maxYear(value: any) {
        if (!Array.isArray(this._year)) {
            this._year = [undefined, undefined];
        }
        // HACK Thingtalk generates songs from 2010 as
        //
        //          release_date >= makeDate(2010,1,1)
        //          release_date <= makeDate(2010,1,1) + 1year
        //
        //      This includes one day in 2011 (like makeDate(2011, 1, 1)). If
        //      we include that one day spotify will get all the songs from
        //      2011, so we convert
        //
        //          makeDate(YEAR, 1, 1) = Date(0, 1, YEAR) -> YEAR - 1
        //
        if (
            value instanceof Date &&
            value.getMonth() === 0 &&
            value.getDate() === 1
        ) {
            this._year[1] = value.getFullYear() - 1;
        } else {
            this._year[1] = yearNumberFor(value);
        }
    }

    isEmpty(): boolean {
        return [
            this._album,
            this._any,
            this._artist,
            this._genre,
            this._tag,
            this._track,
            this._year,
        ].every((v) => v === undefined);
    }

    isArtistQuery(): boolean {
        return (
            [
                this._album,
                this._any,
                this._genre,
                this._tag,
                this._track,
                this._year,
            ].every((v) => v === undefined) && this._artist !== undefined
        );
    }

    isAlbumQuery(): boolean {
        return (
            [
                this._artist,
                this._any,
                this._genre,
                this._tag,
                this._track,
                this._year,
            ].every((v) => v === undefined) && this._album !== undefined
        );
    }

    encodeYear(): undefined | string {
        if (this._year === undefined) {
            return undefined;
        }
        if (Array.isArray(this._year)) {
        }
    }

    protected _valueMap(): Array<
        [string, undefined | string | Value.Entity | YearRange]
    > {
        const pairs: Array<
            [string, undefined | string | Value.Entity | YearRange]
        > = [
            ["album", this._album],
            ["artist", this._artist],
            ["genre", this._genre],
            ["tag", this._tag],
            ["track", this._track],
            ["year", encodeYear(this._year)],
        ];
        return pairs.filter((pair) => pair[1] !== undefined);
    }

    toString(): string {
        const terms: string[] = [];

        if (this._any !== undefined) {
            terms.push(SearchQuery.normalize(this._any));
        }

        for (let [key, value] of this._valueMap()) {
            value = SearchQuery.normalize(value);
            if (value.indexOf(" ") > -1) {
                value = JSON.stringify(value);
            }
            terms.push(`${key}:${value}`);
        }

        return terms.join(" ");
    }
}
