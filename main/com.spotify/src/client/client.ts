// Imports
// ===========================================================================
// Dependencies
// ---------------------------------------------------------------------------

import { Helpers } from "thingpedia";

// Package
// ---------------------------------------------------------------------------

import CacheTrack from "../cache/cache_track";
import Api from "../api";
import CacheAlbum from "../cache/cache_album";
import CacheArtist from "../cache/cache_artist";
import CacheEntity from "../cache/cache_entity";
import CachePlaylist from "../cache/cache_playlist";
import CacheShow from "../cache/cache_show";
import {
    assertUnreachable,
    RedisClient,
    sample,
    uriId,
    uriType,
} from "../helpers";
import {
    Albums,
    Artists,
    Tracks,
    Augment,
    Browse,
    Follow,
    Library,
    Personalization,
    Player,
    Playlists,
    Search,
    Shows,
    Users,
} from ".";
import { PageOptions } from "../api/requests";

// Constants
// ===========================================================================

// const LOG = Logging.get(__filename);

// Class Definition
// ===========================================================================

export class Client {
    // private static readonly log = LOG.childFor(Client);

    public readonly api: Api;
    public readonly redis: RedisClient;
    public readonly userId: string;

    public readonly augment: Augment;
    public readonly albums: Albums;
    public readonly artists: Artists;
    public readonly browse: Browse;
    public readonly follow: Follow;
    public readonly library: Library;
    public readonly personalization: Personalization;
    public readonly player: Player;
    public readonly playlists: Playlists;
    public readonly search: Search;
    public readonly shows: Shows;
    public readonly tracks: Tracks;
    public readonly users: Users;

    constructor({
        useOAuth2,
        redis,
        userId,
    }: {
        useOAuth2: Helpers.Http.HTTPRequestOptions["useOAuth2"];
        redis: RedisClient;
        userId: string;
    }) {
        this.api = new Api({ useOAuth2 });
        this.redis = redis;
        this.userId = userId;

        this.augment = new Augment(this);

        this.albums = new Albums(this);
        this.artists = new Artists(this);
        this.browse = new Browse(this);
        this.follow = new Follow(this);
        this.library = new Library(this);
        this.personalization = new Personalization(this);
        this.player = new Player(this);
        this.playlists = new Playlists(this);
        this.search = new Search(this);
        this.shows = new Shows(this);
        this.tracks = new Tracks(this);
        this.users = new Users(this);
    }

    // Instance Methods
    // =======================================================================
    //
    // Helper Methods
    // -----------------------------------------------------------------------

    // private get log(): Logger {
    //     return Client.log;
    // }

    resolveURI(uri: string): Promise<string[]> {
        const id = uriId(uri);
        switch (uriType(uri)) {
            case "track":
            case "episode":
                // Really shouldn't bother calling for these, but whatever we'll
                // support them...
                return Promise.resolve([uri]);
            case "album":
                return this.albums.getTrackURIs(id);
            case "artist":
                return this.artists.getTopTrackURIs(id);
            case "playlist":
                return this.playlists.getPlaylistTrackURIs(id);
            case "show":
                return this.shows
                    .getUnfinishedEpisodes(id, 10)
                    .then((episodes) => episodes.map((e) => e.uri));
            default:
                assertUnreachable();
        }
    }

    // "Get Any" Instance Methods
    // -----------------------------------------------------------------------
    //
    // Used to serve empty queries for a specific playable type from Genie —
    // "play a X" sort of things.
    //

    getAnyArtists(options: PageOptions = {}): Promise<CacheArtist[]> {
        return this.personalization.getMyTopArtists(options);
    }

    getAnyTracks(options: PageOptions = {}): Promise<CacheTrack[]> {
        return this.personalization.getMyTopTracks(options);
    }

    getAnyAlbums(options: PageOptions = {}): Promise<CacheAlbum[]> {
        return this.browse.getNewReleases(options);
    }

    getAnyPlaylists(options: PageOptions = {}): Promise<CachePlaylist[]> {
        return this.browse.getFeaturedPlaylists(options);
    }

    getAnyShows(options: PageOptions = {}): Promise<CacheShow[]> {
        return this.search.shows({
            ...options,
            query: { year: new Date() },
        });
    }

    async getAnyShow(): Promise<CacheShow> {
        const top10Shows = await this.getAnyShows({ limit: 10 });
        return sample(top10Shows);
    }

    getAnyPlayable(): Promise<CacheEntity[]> {
        return this.getAnyTracks();
    }
}
