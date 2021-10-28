import { strict as assert } from "assert";

import { BaseDevice, Helpers, Value } from "thingpedia";
import * as Winston from "winston";
import {
    CompiledQueryHints,
    ExecEnvironment,
} from "thingtalk/dist/runtime/exec_environment";
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
import { CurrentlyPlayingContextObject, DeviceObject } from "../api/objects";
import { buildQuery, invokeSearch } from "./spotify_device_helpers";
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

// Constants
// ===========================================================================

const LOG = Logging.get(__filename);

const DESKTOP_APP_WAIT_MS = 20000; // 20 seconds
// const HAS_NUMBERS_REGEX = /\d/g;

// Decorators
// ===========================================================================
//
// In here since it's easiest to have them reference SpotifyDevice instead of
// defining a separate interface or creating a circular dependency (not sure
// how JS runtimes deal with that).
//

function genieGet(
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const fn = descriptor.value;

    assert(
        typeof fn === "function",
        `genieGet() can only decorate functions, given ${typeof fn}: ${fn}`
    );

    descriptor.value = async function (
        this: SpotifyDevice,
        params: Params,
        hints: CompiledQueryHints,
        env: ExecWrapper
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
                if (prop === "log") {
                    return log;
                }
                return Reflect.get(target, prop, receiver);
            },
        });
        log.debug("Start Genie GET request");
        const profiler = log.startTimer();
        let response: ReturnType<typeof fn>;
        try {
            response = await fn.call(proxy, params, hints, env);
        } catch (error: any) {
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

function genieDo(
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
) {
    const fn = descriptor.value;

    assert(
        typeof fn === "function",
        `genieDo() can only decorate functions, given ${typeof fn}: ${fn}`
    );

    descriptor.value = async function (
        this: SpotifyDevice,
        params: Params,
        env: ExecWrapper
    ) {
        const log = this.log.childFor(fn, {
            "request.type": "genie.do",
            "env.app.uniqueId": env.app.uniqueId,
            params,
        });
        if (isTestMode()) {
            log.debug("In test mode, aborting.");
            return;
        }
        log.debug("Start Genie DO request");
        const proxy = new Proxy(this, {
            get(target, prop, receiver) {
                if (prop === "log") {
                    return log;
                }
                return Reflect.get(target, prop, receiver);
            },
        });
        const profiler = log.startTimer();
        let response: ReturnType<typeof fn>;
        try {
            response = await fn.call(proxy, params, env);
        } catch (error: any) {
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

// Class Definition
// ===========================================================================

export default class SpotifyDevice extends BaseDevice {
    // private static readonly log = LOG.childFor(SpotifyDevice);

    // TODO Unsure what this is here for...
    public uniqueId: string;
    // WARN Do _NOT_ initialize this!!! It's done automatically, and
    // initialization will break things!
    public accessToken: undefined | string;

    public spotifyd: undefined | SpotifyDaemon = undefined;
    public readonly log: Logger.TLogger;

    public state: SpotifyDeviceState;

    protected _tokenizer: Tokenizer;
    protected _failedToLaunchDesktopApp: boolean = false;
    protected _client: Client;
    protected _queueBuilders: QueueBuilderManager;
    protected _playerDevice: undefined | DeviceObject;
    protected _redis: RedisClient;

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
            useOAuth2: this as Helpers.Http.HTTPRequestOptions["useOAuth2"],
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
        if (this.spotifyd && this.accessToken !== accessToken) {
            this.log.debug(
                "Setting spotifyd access token and triggering reload..."
            );
            this.spotifyd.token = accessToken;
            this.spotifyd.reload();
        }
        await super.updateOAuth2Token(accessToken, refreshToken, extraData);
        this.log.debug("Access token updated.");
    }

    async start(): Promise<void> {
        this.log.debug("Starting...");
        await this._redis.connect();
        // Try to get a device to play on, which has the added benefit of
        // refreshing the access token
        await this._setPlayerDevice();
        this.log.debug("Started.");
    }

    // Helper Instance Methods
    // -----------------------------------------------------------------------

    /**
     * Convert all instances of numbers to digits
     */
    protected _formatTitle(title: string): string {
        // TODO Why was this being done?
        return title;
        // let result = "";
        // for (const word of title.split(" ")) {
        //     if (HAS_NUMBERS_REGEX.test(word)) {
        //         result += word + " ";
        //     } else {
        //         const parsed = this._tokenizer._parseWordNumber(word);
        //         if (isNaN(parsed)) {
        //             result += word + " ";
        //         } else if (
        //             parsed === 0 &&
        //             word !== "zero" &&
        //             word !== "zeroth" &&
        //             word !== "zeroeth"
        //         ) {
        //             result += word + " ";
        //         } else {
        //             result += parsed + " ";
        //         }
        //     }
        // }
        // return result.trim();
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

    protected _canLaunchDesktopApp(): boolean {
        const log = this.log.childFor(this._canLaunchDesktopApp);
        if (this._failedToLaunchDesktopApp) {
            log.debug("Unable to launch desktop app -- failed to in the past");
            return false;
        }
        if (this.platform.hasCapability("app-launcher")) {
            log.debug(
                "Able to launch desktop app -- has 'app-launcher' capability"
            );
            return true;
        } else {
            log.debug(
                "Unable to launch desktop app -- no 'app-launcher' capability"
            );
            return false;
        }
    }

    protected async _launchDesktopApp(): Promise<DeviceObject[]> {
        const log = this.log.childFor(this._findPlayerDevice);

        const appLauncher = this.platform.getCapability("app-launcher");

        assert(
            appLauncher !== null,
            "appLauncher is null -- did you call _canLaunchDesktopApp() first?"
        );

        log.debug("Launching Spotify desktop app...");
        await appLauncher.launchApp("com.spotify.Client.desktop");

        log.debug(
            `Async sleeping for ${DESKTOP_APP_WAIT_MS / 1000} seconds...`
        );
        await new Promise((resolve) =>
            setTimeout(resolve, DESKTOP_APP_WAIT_MS)
        );

        log.debug("Getting player devices again...");
        const devices = await this._client.player.getDevices();

        if (devices.length === 0) {
            log.warn("Failed to launch Spotify desktop app, won't try again.");
            this._failedToLaunchDesktopApp = true;
        } else {
            log.debug("(Presumably) launched Spotify desktop app", { devices });
        }

        return devices;
    }

    protected async _findPlayerDevice({
        env,
        attemptToLaunch = true,
    }: {
        env?: ExecWrapper;
        attemptToLaunch?: boolean;
    } = {}): Promise<DeviceObject> {
        const log = this.log.childFor(this._findPlayerDevice);

        log.debug("Getting active player device...");

        let devices = await this._client.player.getDevices();

        if (devices.length > 0) {
            log.debug("Found player devices", { devices });
        } else if (attemptToLaunch) {
            log.warn("No player devices available");

            if (this._canLaunchDesktopApp()) {
                devices = await this._launchDesktopApp();
            } else {
                log.debug("Can't launch Spotify desktop app");
            }

            // try initializing the player using the audio controller
            if (this.engine.audio && this.engine.audio.checkCustomPlayer) {
                log.debug(
                    "Try initializing the player using the audio controller..."
                );
                const ok = await this.engine.audio.checkCustomPlayer(
                    {
                        type: "spotify",
                        username: this.state.id,
                        accessToken: this.accessToken,
                    },
                    env ? env.conversation : undefined
                );

                if (ok) {
                    log.debug(
                        "Audio controller initialized, getting devices..."
                    );
                    devices = await this._client.player.getDevices();

                    if (devices.length > 0) {
                        log.debug(
                            "Found devices after audio controller initialization.",
                            { devices }
                        );
                    }
                }
            } else {
                log.debug("Audio controller unavailable");
            }

            if (devices.length === 0) {
                log.error("Failed to launch/initialize any player devices");
                throw new ThingError("No player devices", "no_active_device");
            }
        } else {
            throw new ThingError("No player devices", "no_active_device");
        }

        // Prefer spotifyd if we have one ("server" platform)
        if (this.spotifyd !== undefined) {
            const spotifydDevice = devices.find(
                (device) => device.id === this.spotifyd?.deviceId
            );
            if (spotifydDevice !== undefined) {
                log.debug(`Found spotifyd device, returning`, {
                    device: spotifydDevice,
                });
                return spotifydDevice;
            }
        }

        // Prefer the Genie C++ client, if available
        const genieCPPDevice = devices.find(
            (device) => device.name === "genie-cpp"
        );
        if (genieCPPDevice !== undefined) {
            log.debug("Found genie-cpp device, returning", {
                device: genieCPPDevice,
            });
            return genieCPPDevice;
        }

        const activeDevice = devices.find((device) => device.is_active);
        if (activeDevice === undefined) {
            log.warn("No active device found, returning first device", {
                device: devices[0],
            });
            return devices[0];
        } else {
            log.debug("Found active device, returning.", {
                device: activeDevice,
            });
        }
        return activeDevice;
    }

    protected async _setPlayerDevice() {
        const log = this.log.childFor(this._setPlayerDevice);
        log.debug("Attempting to set player device...");
        let device: undefined | DeviceObject = undefined;
        try {
            device = await this._findPlayerDevice({ attemptToLaunch: false });
        } catch (error: any) {
            if (error instanceof Error) {
                log.warn("Failed to set player device", error);
            } else {
                log.warn("Failed to set player device", { error });
            }
            return;
        }
        this._playerDevice = device;
        log.info("Set player device.", { device });
    }

    protected async _getPlayerDevice(env?: ExecWrapper) {
        if (this._playerDevice !== undefined) {
            return this._playerDevice;
        }
        return await this._findPlayerDevice({ env });
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
        hints: CompiledQueryHints,
        env: ExecWrapper
    ): Promise<ThingPlayable[]> {
        if (!hints.filter) {
            return (await this._client.getAnyPlayable()).map((playable) =>
                playable.toThing(this._formatTitle.bind(this))
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
                playable.toThing(this._formatTitle.bind(this))
            );
        }

        if (query.isArtistQuery() && isEntity(query.artist)) {
            this.log.debug(
                "Optimizing artist Entity search to artists.getTopTracks"
            );
            const artistId = uriId(query.artist.value);
            return (await this._client.artists.getTopTracks(artistId)).map(
                (track) => track.toThing(this._formatTitle.bind(this))
            );
        }

        if (query.isAlbumQuery() && isEntity(query.album)) {
            this.log.debug("Optimizing album Entity search to albums.get");
            const albumId = uriId(query.album.value);
            return [
                (await this._client.albums.get(albumId)).toThing(
                    this._formatTitle.bind(this)
                ),
            ];
        }

        return (await this._client.search.playables({ query, limit: 5 })).map(
            (playable) => playable.toThing(this._formatTitle.bind(this))
        );
    }

    @genieGet
    async get_artist(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecWrapper
    ): Promise<ThingArtist[]> {
        return (
            await invokeSearch(
                hints,
                "any",
                this._client.search.artists.bind(this._client.search),
                this._client.getAnyArtists.bind(this._client),
                { limit: 10 }
            )
        ).map((x) => x.toThing(this._formatTitle.bind(this)));
    }

    @genieGet
    async get_song(
        params: Params,
        hints: CompiledQueryHints,
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
        ).map((x) => x.toThing(this._formatTitle.bind(this)));
    }

    @genieGet
    async get_album(
        params: Params,
        hints: CompiledQueryHints,
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
        ).map((x) => x.toThing(this._formatTitle.bind(this)));
    }

    @genieGet
    async get_show(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingShow[]> {
        if (!hints.filter) {
            const show = await this._client.getAnyShow();
            return [show.toThing(this._formatTitle.bind(this))];
        }

        const query = buildQuery(hints.filter, "any");

        if (query.isEmpty()) {
            const show = await this._client.getAnyShow();
            return [show.toThing(this._formatTitle.bind(this))];
        }

        const shows = await this._client.search.shows({ query, limit: 10 });

        return shows.map((show) => show.toThing(this._formatTitle.bind(this)));
    }

    @genieGet
    async get_playlist(
        params: Params,
        hints: CompiledQueryHints,
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
        ).map((x) => x.toThing(this._formatTitle.bind(this)));
    }

    @genieGet
    get_get_user_top_tracks(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<Array<{ song: ThingTrack }>> {
        // TODO https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term
        return this._client.personalization.getMyTopTracks().then((tracks) =>
            tracks.map((track) => ({
                song: track.toThing(this._formatTitle.bind(this)),
            }))
        );
    }

    @genieGet
    async get_get_currently_playing(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingTrack | ThingEpisode> {
        const response = await this._client.player.getCurrentlyPlaying();

        if (response === undefined) {
            throw new ThingError("No song playing", "no_song_playing");
        }
        return response.toThing(this._formatTitle.bind(this));
    }

    @genieGet
    async get_get_play_info(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<undefined | CurrentlyPlayingContextObject> {
        return this._client.player.get();
    }

    @genieGet
    async get_get_available_devices(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<DeviceObject[]> {
        if (isTestMode()) {
            // TODO This is weird like this...
            //
            // https://github.com/stanford-oval/thingpedia-common-devices/blob/4c20248f87d000be1aef906d34b74a820aa03788/main/com.spotify/index.js#L906
            //
            return [
                {
                    id: "mock",
                    is_active: true,
                    is_private_session: false,
                    is_restricted: false,
                    name: "Coolest Computer",
                    type: "Computer",
                    volume_percent: 100,
                },
            ];
        }
        return await this._client.player.getDevices();
    }

    @genieGet
    get_get_song_from_library(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingTrack[]> {
        return this._client.library
            .getTracks()
            .then((list) =>
                list.map((item) => item.toThing(this._formatTitle.bind(this)))
            );
    }

    @genieGet
    get_get_album_from_library(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingAlbum[]> {
        return this._client.library
            .getAlbums()
            .then((list) =>
                list.map((item) => item.toThing(this._formatTitle.bind(this)))
            );
    }

    @genieGet
    get_get_show_from_library(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingShow[]> {
        return this._client.library
            .getShows()
            .then((list) =>
                list.map((item) => item.toThing(this._formatTitle.bind(this)))
            );
    }

    @genieGet
    get_get_artist_from_library(
        params: Params,
        hints: CompiledQueryHints,
        env: ExecEnvironment
    ): Promise<ThingArtist[]> {
        return this._client.follow
            .getMyArtists()
            .then((list) =>
                list.map((item) => item.toThing(this._formatTitle.bind(this)))
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
        await this._negotiatePlay({
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
