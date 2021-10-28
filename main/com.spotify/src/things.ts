import { Value } from "thingpedia";

export class ThingError extends Error {
    code: string;

    constructor(message: string, code: string) {
        super(message);
        this.code = code;
    }
}

export interface ThingTrack {
    id: Value.Entity;
    artists: Value.Entity[];
    album: Value.Entity;
    genres: string[];
    release_date: Date;
    popularity: number; // int [0, 100]
    energy: number; // int [0, 100]
    danceability: number; // int [0, 100]
}

export interface ThingArtist {
    id: Value.Entity;
    genres: string[];
    popularity: number; // int[0, 100]
}

export interface ThingAlbum {
    id: Value.Entity;
    artists: Value.Entity[];
    release_date: Date;
    popularity: number; // int[0, 100]
    genres: string[];
}

export interface ThingPlaylist {
    id: Value.Entity;
}

export interface ThingShow {
    id: Value.Entity;
    publisher: string;
}

export interface ThingEpisode {
    id: Value.Entity;
}

export type ThingPlayable =
    | ThingTrack
    | ThingArtist
    | ThingAlbum
    | ThingPlaylist
    | ThingShow;

export function isEntity(x: any): x is Value.Entity {
    return typeof x === "object" && x instanceof Value.Entity;
}
