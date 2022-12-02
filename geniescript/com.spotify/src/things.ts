import SpotifyEntity from "./spotify_entity";

export class ThingError extends Error {
    code : string;

    constructor(message : string, code : string) {
        super(message);
        this.code = code;
    }
}

export interface ThingTrack {
    id : SpotifyEntity;
    artists : SpotifyEntity[];
    album : SpotifyEntity;
    genres : string[];
    release_date : Date;
    popularity : number; // int [0, 100]
    energy : number; // int [0, 100]
    danceability : number; // int [0, 100]
}

export interface ThingArtist {
    id : SpotifyEntity;
    genres : string[];
    popularity : number; // int[0, 100]
}

export interface ThingAlbum {
    id : SpotifyEntity;
    artists : SpotifyEntity[];
    release_date : Date;
    popularity : number; // int[0, 100]
    genres : string[];
}

export interface ThingPlaylist {
    id : SpotifyEntity;
}

export interface ThingShow {
    id : SpotifyEntity;
    publisher : string;
}

export interface ThingEpisode {
    id : SpotifyEntity;
    release_date : Date;
}

export type ThingPlayable =
    | ThingTrack
    | ThingArtist
    | ThingAlbum
    | ThingPlaylist
    | ThingShow;

export function isEntity(x : any) : x is SpotifyEntity {
    return typeof x === "object" && x instanceof SpotifyEntity;
}
