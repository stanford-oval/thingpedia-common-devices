import { CurrentlyPlayingContextObject, DeviceObject } from "../../api/objects";
import { DeviceOptions, RepeatState } from "../../api/requests";
import CacheEpisode from "../../cache/cache_episode";
import CacheTrack from "../../cache/cache_track";
import { assertUnreachable, isSingularURI } from "../../helpers";
import { Component } from "..";

export class Player extends Component {
    async getCurrentlyPlaying(): Promise<void | CacheTrack | CacheEpisode> {
        const playing = await this._api.player.getCurrentlyPlaying({
            market: "from_token",
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

    pause(options: DeviceOptions = {}): Promise<void> {
        return this._api.player.pause(options);
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
