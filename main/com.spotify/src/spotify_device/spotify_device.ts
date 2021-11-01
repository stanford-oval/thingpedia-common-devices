import { BaseDevice, Value } from "thingpedia";
import * as Winston from "winston";
import type { Runtime, ExecEnvironment } from "thingtalk";
import { Logger } from "@stanford-oval/logging";
import * as Redis from "redis";

import SpotifyDaemon from "../spotify_daemon";
import { Client } from "../client";
import {
    isEntity,
    ThingAlbum,
    ThingArtist,
    ThingEpisode,
    ThingError,
    ThingPlayable,
    ThingPlaylist,
    ThingShow,
    ThingTrack,
} from "../things";
import { SearchQuery } from "../api/search_query";
import Logging from "../logging";
import {
    cast,
    isString,
    isTestMode,
    RedisClient,
    uriId,
    uriType,
} from "../helpers";
import { DeviceObject } from "../api/objects";
import {
    buildQuery,
    invokeSearch,
    genieGet,
    genieDo,
} from "./spotify_device_helpers";
import QueueBuilderManager from "./queue_builder_manager";
import {
    isOnOff,
    Params,
    SpotifyDeviceEngine,
    SpotifyDeviceState,
    Tokenizer,
    ExecWrapper,
} from "./types";
import { isRepeatState } from "../api/requests";
import PlayerDeviceManager from "./player_device_manager";
import { DisplayFormatter } from "../cache/cache_entity";
import SearchFilter from "./search_filter";

// Constants
// ===========================================================================

const LOG = Logging.get(__filename);

// Class Definition
// ===========================================================================

export default class SpotifyDevice extends BaseDevice {
    // private static readonly log = LOG.childFor(SpotifyDevice);

    // TODO Unsure what this is here for...
    public uniqueId: string;
    // WARN Do _NOT_ initialize this!!! It's done automatically, and
    // initialization will break things!
    public accessToken: undefined | string;

    public readonly spotifyd: undefined | SpotifyDaemon = undefined;
    public readonly log: Logger.TLogger;

    public state: SpotifyDeviceState;

    protected _tokenizer: Tokenizer;
    protected _failedToLaunchDesktopApp: boolean = false;
    protected _client: Client;
    protected _queueBuilders: QueueBuilderManager;
    protected _playerDevice: undefined | DeviceObject;
    protected _redis?: RedisClient;
    protected _playerDeviceManager: PlayerDeviceManager;
    protected _displayFormatter: DisplayFormatter;
    protected _searchFilter: SearchFilter;

    constructor(engine: SpotifyDeviceEngine, state: SpotifyDeviceState) {
        super(engine, state);
        this.state = state;
        this.uniqueId = `com.spotify-${this.state.id}`;
        this._tokenizer = engine.langPack.getTokenizer();

        this.log = LOG.childFor(SpotifyDevice, { "state.id": state.id });
        this.log.debug("Constructing...");

        if (this.platform.type === "server") {
            this.spotifyd = new SpotifyDaemon({
                cacheDir: this.platform.getCacheDir(),
                username: this.state.id,
                device_name: this.state.id,
                token: this.accessToken,
                // TODO Upgrade?
                version: "v0.3.2",
            });
        }

        this._redis = Redis.createClient({ url: "redis://redis" });

        this._client = new Client({
            useOAuth2: this,
            redis: this._redis,
            userId: this.state.id,
        });

        this._queueBuilders = new QueueBuilderManager({
            resolveURI: this._client.resolveURI.bind(this._client),
            getActiveDevice: this._getPlayerDevice.bind(this),
            play: this._negotiatePlay.bind(this),
            addToQueue: this._client.player.addToQueue.bind(
                this._client.player
            ),
        });

        this._playerDeviceManager = new PlayerDeviceManager({
            accessToken: this.accessToken,
            client: this._client,
            engine: this.engine,
            platform: this.platform,
            spotifyd: this.spotifyd,
            username: this.state.id,
        });

        this._displayFormatter = this._formatEntityDisplay.bind(this);

        this._searchFilter = new SearchFilter();

        this.log.debug("Constructed.");
    }

    get engine(): SpotifyDeviceEngine {
        return super.engine as SpotifyDeviceEngine;
    }

    async updateOAuth2Token(
        accessToken: string,
        refreshToken: string,
        extraData: {
            [key: string]: unknown;
        }
    ): Promise<void> {
        this.log.debug("Updating access token...");
        if (this.accessToken !== accessToken) {
            if (this.spotifyd) {
                this.log.debug(
                    "Setting spotifyd access token and triggering reload..."
                );
                this.spotifyd.token = accessToken;
                this.spotifyd.reload();
            }
            this._playerDeviceManager.accessToken = accessToken;
        }
        await super.updateOAuth2Token(accessToken, refreshToken, extraData);
        this.log.debug("Access token updated.");
    }

    async start(): Promise<void> {
        this.log.debug("Starting...");
        await this._redis?.connect();
        // Try to get a device to play on, which has the added benefit of
        // refreshing the access token
        this._playerDeviceManager.start();
        this.log.debug("Started.");
    }

    // Helper Instance Methods
    // -----------------------------------------------------------------------

    /**
     * Normalize titles in the way Genie expects.
     *
     * One result is converting all "number words" to digits, such as
     *
     *      "one" => "1"
     *
     */
    protected _formatEntityDisplay(input: string): string {
        return this._tokenizer.tokenize(input).rawTokens.join(" ");
    }

    protected _handleError(profiler: Winston.Profiler, error: any): never {
        if (error instanceof ThingError) {
            profiler.done({
                level: "info",
                message: `Handled Error -- ${error.message}`,
                stack: error.stack,
                code: error.code,
            });
            throw error;
        } else if (error instanceof Error) {
            const message = `Unhandled Error -- ${error.name}: ${error.message}`;
            profiler.done({
                level: "error",
                message,
                stack: error.stack,
                "error.name": error.name,
            });
            throw new ThingError(message, "disallowed_action");
        } else {
            profiler.done({
                level: "error",
                message: "Unknown value raised/rejected",
                error: error,
            });
            throw error;
        }
    }

    protected _checkPremium() {
        if (
            this.state.product !== "premium" &&
            this.state.product !== undefined
        ) {
            throw new ThingError(
                "Premium account required",
                "non_premium_account"
            );
        }
    }

    protected async _getPlayerDevice(env?: ExecWrapper): Promise<DeviceObject> {
        return this._playerDeviceManager.get(env);
    }

    protected async _negotiatePlay({
        device_id,
        uris,
    }: {
        device_id?: string;
        uris?: string | string[];
    }): Promise<void> {
        const log = this.log.childFor(this._negotiatePlay, { device_id, uris });

        log.debug("Negotiating play...");

        if (isTestMode()) {
            log.debug("In test mode, aborting.");
            return;
        }

        if (this.engine.audio) {
            log.debug("Engine has audio controller, requesting audio...");
            await this.engine.audio.requestAudio(this, {
                resume: async () => {
                    log.debug("Audio controller -- resuming audio");
                    try {
                        await this._client.player.play({ device_id });
                    } catch (error: any) {
                        log.error("Failed to resume audio --", error);
                    }
                },

                stop: async () => {
                    log.debug("Audio controller -- stopping audio");
                    try {
                        await this._client.player.pause({ device_id });
                    } catch (error: any) {
                        console.error("Failed to stop audio --", error);
                    }
                },
            });
            log.debug("Audio control received.");
        }

        log.debug("Playing...");
        try {
            await this._client.player.play({
                device_id,
                uris,
            });
        } catch (error) {
            log.error("Error playing", { error });
            const player_info = await this._client.player.get();
            if (player_info) {
                //regular spotify players will throw an error when songs are
                //already playing
                throw new ThingError("Disallowed Action", "disallowed_action");
            } else {
                //web players will throw an error when songs are not playing
                throw new ThingError("Player Error", "player_error");
            }
        }
        log.debug("Played.");
    }

    // Genie Instance Methods
    // -----------------------------------------------------------------------
    //
    // ### Queries ###########################################################

    @genieGet
    async get_playable(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecWrapper
    ): Promise<ThingPlayable[]> {
        if (!hints.filter) {
            return (await this._client.getAnyPlayable()).map((playable) =>
                playable.toThing(this._displayFormatter)
            );
        }

        const query = buildQuery(hints.filter, "any");

        if (SearchQuery.normalize(query.any).includes("daily mix")) {
            throw new ThingError(
                `Search for daily mix doesn't work`,
                "dailymix_error"
            );
        }

        if (query.isEmpty()) {
            return (await this._client.getAnyPlayable()).map((playable) =>
                playable.toThing(this._displayFormatter)
            );
        }

        if (query.isArtistQuery() && isEntity(query.artist)) {
            this.log.debug(
                "Optimizing artist Entity search to artists.getTopTracks"
            );
            const artistId = uriId(query.artist.value);
            return (await this._client.artists.getTopTracks(artistId)).map(
                (track) => track.toThing(this._displayFormatter)
            );
        }

        if (query.isAlbumQuery() && isEntity(query.album)) {
            this.log.debug("Optimizing album Entity search to albums.get");
            const albumId = uriId(query.album.value);
            return [
                (await this._client.albums.get(albumId)).toThing(
                    this._displayFormatter
                ),
            ];
        }

        return (await this._client.search.playables({ query, limit: 5 })).map(
            (playable) => playable.toThing(this._displayFormatter)
        );
    }

    @genieGet
    async get_artist(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecWrapper
    ): Promise<ThingArtist[]> {
        // const log = this.log.childFor(this.get_artist);

        const limit = 10;
        if (!hints.filter) {
            return (await this._client.getAnyArtists({ limit })).map((artist) =>
                artist.toThing(this._displayFormatter)
            );
        }

        const query = buildQuery(hints.filter, "any");

        if (query.isEmpty()) {
            return (await this._client.getAnyArtists({ limit })).map((artist) =>
                artist.toThing(this._displayFormatter)
            );
        }

        const artists = await this._client.search.artists({ query, limit });

        const filtered = this._searchFilter.filter(artists, query.any);

        return filtered.map((artist) =>
            artist.toThing(this._displayFormatter, true)
        );

        // const info: Record<string, any>[] = [];
        // const things = artists.map((artist, index) => {
        //     let forceSoftmatch = false;

        //     if (index === 0) {
        //         forceSoftmatch = true;
        //     }

        //     info.push({
        //         name: artist.name,
        //         popularity: artist.popularity,
        //         forceSoftmatch,
        //     });

        //     return artist.toThing(this._displayFormatter, forceSoftmatch);
        // });

        // log.info("Search info", { info });

        // return things;

        // return (
        //     await invokeSearch(
        //         hints,
        //         "any",
        //         this._client.search.artists.bind(this._client.search),
        //         this._client.getAnyArtists.bind(this._client),
        //         { limit: 10 }
        //     )
        // ).map((x) => x.toThing(this._displayFormatter));
    }

    @genieGet
    async get_song(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecWrapper
    ): Promise<ThingTrack[]> {
        return (
            await invokeSearch(
                hints,
                "track",
                this._client.search.tracks.bind(this._client.search),
                this._client.getAnyTracks.bind(this._client),
                { limit: 10 }
            )
        ).map((x) => x.toThing(this._displayFormatter));
    }

    @genieGet
    async get_album(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingAlbum[]> {
        return (
            await invokeSearch(
                hints,
                "album",
                this._client.search.albums.bind(this._client.search),
                this._client.getAnyAlbums.bind(this._client),
                { limit: 10 }
            )
        ).map((x) => x.toThing(this._displayFormatter));
    }

    @genieGet
    async get_show(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingShow[]> {
        if (!hints.filter) {
            const show = await this._client.getAnyShow();
            return [show.toThing(this._displayFormatter)];
        }

        const query = buildQuery(hints.filter, "any");

        if (query.isEmpty()) {
            const show = await this._client.getAnyShow();
            return [show.toThing(this._displayFormatter)];
        }

        const shows = await this._client.search.shows({ query, limit: 10 });

        return shows.map((show) => show.toThing(this._displayFormatter));
    }

    @genieGet
    async get_playlist(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingPlaylist[]> {
        return (
            await invokeSearch(
                hints,
                "any",
                this._client.search.playlists.bind(this._client.search),
                this._client.getAnyPlaylists.bind(this._client),
                { limit: 10 }
            )
        ).map((x) => x.toThing(this._displayFormatter));
    }

    @genieGet
    get_get_user_top_tracks(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<Array<{ song: ThingTrack }>> {
        // TODO https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term
        return this._client.personalization.getMyTopTracks().then((tracks) =>
            tracks.map((track) => ({
                song: track.toThing(this._displayFormatter),
            }))
        );
    }

    @genieGet
    async get_get_currently_playing(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingTrack | ThingEpisode> {
        const response = await this._client.player.getCurrentlyPlaying();

        if (response === undefined) {
            throw new ThingError("No song playing", "no_song_playing");
        }
        return response.toThing(this._displayFormatter);
    }

    @genieGet
    get_get_song_from_library(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingTrack[]> {
        return this._client.library
            .getTracks()
            .then((list) =>
                list.map((item) => item.toThing(this._displayFormatter))
            );
    }

    @genieGet
    get_get_album_from_library(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingAlbum[]> {
        return this._client.library
            .getAlbums()
            .then((list) =>
                list.map((item) => item.toThing(this._displayFormatter))
            );
    }

    @genieGet
    get_get_show_from_library(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingShow[]> {
        return this._client.library
            .getShows()
            .then((list) =>
                list.map((item) => item.toThing(this._displayFormatter))
            );
    }

    @genieGet
    get_get_artist_from_library(
        params: Params,
        hints: Runtime.CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingArtist[]> {
        return this._client.follow
            .getMyArtists()
            .then((list) =>
                list.map((item) => item.toThing(this._displayFormatter))
            );
    }

    // #######################################################################
    // ### Actions ###########################################################
    // #######################################################################

    @genieDo
    async do_play(
        params: Params,
        env: ExecWrapper
    ): Promise<{ device: Value.Entity }> {
        const playable = cast(
            isEntity,
            params.playable,
            "Expected params.playable to be an Entity"
        );
        this._checkPremium();

        const builder = await this._queueBuilders.get(env);
        builder.push(playable);
        return { device: builder.deviceEntity };
    }

    @genieDo
    async do_add_item_to_library(
        params: Params,
        env: ExecWrapper
    ): Promise<void> {
        const playable = cast(
            isEntity,
            params.playable,
            "Expected params.playable to be an Entity"
        );
        const id = uriId(playable.value);
        const type = uriType(playable.value);
        let method: (id: string) => Promise<void>;

        switch (type) {
            case "album":
                method = this._client.library.putAlbums;
                break;
            case "track":
                method = this._client.library.putTracks;
                break;
            case "show":
                method = this._client.library.putShows;
                break;
            case "episode":
                method = this._client.library.putEpisodes;
                break;
            default:
                throw new ThingError(
                    `Can not add ${type} to library`,
                    "disallowed_action"
                );
        }

        await method.bind(this._client.library)(id);
    }

    @genieDo
    async do_add_artist_to_library(params: Params, env: ExecWrapper) {
        const artist = cast(
            isEntity,
            params.artist,
            "Expected params.artist to be an Entity"
        );
        const id = uriId(artist.value);
        const type = uriType(artist.value);
        if (type !== "artist") {
            throw new TypeError(
                `Expected artist Entity, given ${artist.value}`
            );
        }
        await this._client.follow.putArtists(id);
    }

    @genieDo
    async do_create_playlist(params: Params, env: ExecWrapper): Promise<void> {
        const name = cast(
            isString,
            params.name,
            "Expected params.name to be a string"
        );
        await this._client.playlists.create(this.state.id, name);
    }

    @genieDo
    async do_player_play(params: Params, env: ExecWrapper) {
        this._checkPremium();
        const device = await this._getPlayerDevice(env);

        // play asynchronously: playing will call requestAudio on the audio controller,
        // which will wait until the agent is done speaking, so we must return here
        this._negotiatePlay({
            device_id: device.id,
        });
    }

    @genieDo
    async do_player_pause(params: Params, env: ExecWrapper) {
        this._checkPremium();
        const device = await this._getPlayerDevice(env);
        return this._client.player.pause({
            device_id: device.id,
        });
    }

    @genieDo
    async do_player_next(params: Params, env: ExecWrapper) {
        this._checkPremium();
        const device = await this._getPlayerDevice(env);
        return this._client.player.next({
            device_id: device.id,
        });
    }

    @genieDo
    async do_player_previous(params: Params, env: ExecWrapper) {
        this._checkPremium();
        const device = await this._getPlayerDevice(env);
        return this._client.player.previous({
            device_id: device.id,
        });
    }

    @genieDo
    async do_player_shuffle(params: Params, env: ExecWrapper) {
        const shuffle = cast(
            isOnOff,
            params.shuffle,
            "Expected params.shuffle to be 'on' or 'off'"
        );
        this._checkPremium();
        const device = await this._getPlayerDevice(env);
        await this._client.player.shuffle(shuffle === "on", {
            device_id: device.id,
        });
    }

    @genieDo
    async do_player_repeat(params: Params, env: ExecWrapper) {
        const repeat = cast(
            isRepeatState,
            params.repeat,
            "Expected params.repeat to be 'track', 'context', or 'off'"
        );
        this._checkPremium();
        const device = await this._getPlayerDevice(env);
        await this._client.player.repeat(repeat, {
            device_id: device.id,
        });
    }

    @genieDo
    async do_add_song_to_playlist(params: Params, env: ExecWrapper) {
        const song = cast(
            isEntity,
            params.song,
            "Expected params.song to be an Entity"
        );
        const playlistName = cast(
            isString,
            params.playlist,
            "Expected params.playlist to be a string"
        );

        const playlistId = await this._client.playlists.findMyId(playlistName);

        if (playlistId === null) {
            throw new ThingError(
                `Failed to find playlist ${JSON.stringify(playlistName)}`,
                "no_playlist"
            );
        }

        await this._client.playlists.add(playlistId, song.value);
    }
}
