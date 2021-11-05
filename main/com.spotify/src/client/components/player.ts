import { CurrentlyPlayingContextObject, DeviceObject } from "../../api/objects";
import { DeviceOptions, RepeatState } from "../../api/requests";
import CacheEpisode from "../../cache/cache_episode";
import CacheTrack from "../../cache/cache_track";
import { assertUnreachable, isSingularURI } from "../../helpers";
import { Component } from "..";
import { ThingError } from "../../things";

export class Player extends Component {
    async getCurrentlyPlaying(): Promise<void | CacheTrack | CacheEpisode> {
        const playing = await this._api.player.getCurrentlyPlaying({
            market: "from_token",
            additional_types: "episode"
        });

        if (playing === undefined) {
            return undefined;
        }

        if (playing.item === null) {
            return undefined;
        } else if (playing.item.type === "track") {
            return this.augment.track(playing.item);
        } else if (playing.item.type === "episode") {
            return this.augment.episode(playing.item);
        } else {
            assertUnreachable();
        }
    }

    get(): Promise<undefined | CurrentlyPlayingContextObject> {
        return this._api.player.get();
    }

    getDevices(): Promise<DeviceObject[]> {
        return this._api.player.getDevices();
    }

    async pause(options: DeviceOptions = {}): Promise<void> {
        try {
            await this._api.player.pause(options);
        } catch(e) {
            if (!(e instanceof ThingError))
                throw e;
            console.error(`Got error ${e.code} in call to Spotify pause API: ${e.message}`);
            if (e.message === 'Device not found') {
                // we didn't find a device at this ID
                // ie, spotifyd crashed or was killed
                // nothing to do
                return;
            }
            if (e.message === 'Player command failed: Restriction violated') {
                // this happens when we try to remote control
                // a player and the player is not in the right
                // state (ie, it's already paused)
                return;
            }
            // bubble up everything else
            throw e;
        }
    }

    next(options: DeviceOptions = {}): Promise<void> {
        return this._api.player.next(options);
    }

    previous(options: DeviceOptions = {}): Promise<void> {
        return this._api.player.previous(options);
    }

    shuffle(state: boolean, options: DeviceOptions = {}): Promise<void> {
        return this._api.player.shuffle(state, options);
    }

    repeat(state: RepeatState, options: DeviceOptions = {}): Promise<void> {
        return this._api.player.repeat(state, options);
    }

    addToQueue(deviceId: string, uri: string): Promise<void> {
        return this._api.player.addToQueue(deviceId, uri);
    }

    play({
        device_id,
        uris,
        offset,
        position_ms,
    }: {
        device_id?: string;
        uris?: string | string[];
        offset?: number;
        position_ms?: number;
    }): Promise<void> {
        let context_uri: undefined | string = undefined;

        if (typeof uris === "string") {
            // A single string was passed as `uris`
            if (isSingularURI(uris)) {
                // A single URI was passed that is "singular" — either a track
                // or episode — and can directly be played, though `uris` is an
                // array, so we need to encapsulate it
                uris = [uris];
            } else {
                // A single URI was passed that is a "context" — album,
                // playlist, etc.
                //
                // We want to swap it into the `context_uri`
                context_uri = uris;
                uris = undefined;
            }
        }

        return this._api.player.play({
            device_id,
            uris,
            context_uri,
            offset,
            position_ms,
        });
    }
}
