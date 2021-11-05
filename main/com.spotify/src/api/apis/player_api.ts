import {
    CurrentlyPlayingContextObject,
    CurrentlyPlayingObject,
    DeviceObject,
} from "../objects";
import { DeviceOptions, RepeatState } from "../requests";
import BaseApi from "./base_api";

export default class PlayerApi extends BaseApi {
    getCurrentlyPlaying(options: {
        market: string;
        additional_types?: string | string[];
    }): Promise<void | CurrentlyPlayingObject> {
        return this._http.get<void | CurrentlyPlayingObject>(
            "/v1/me/player/currently-playing",
            options
        );
    }

    get(
        options: {
            market?: string;
            additional_types?: string | string[];
        } = {}
    ): Promise<undefined | CurrentlyPlayingContextObject> {
        return this._http.get<undefined | CurrentlyPlayingContextObject>(
            "/v1/me/player",
            options
        );
    }

    getDevices(): Promise<DeviceObject[]> {
        return this._http.getList<DeviceObject>("/v1/me/player/devices");
    }

    play({
        device_id,
        ...body
    }: {
        device_id?: string;
        uris?: string | string[];
        context_uri?: string;
        offset?: number;
        position_ms?: number;
    } = {}): Promise<void> {
        return this._http.request<void>({
            method: "PUT",
            path: "/v1/me/player/play",
            query: { device_id },
            body,
        });
    }

    addToQueue(deviceId: string, uri: string): Promise<void> {
        return this._http.request<void>({
            method: "POST",
            path: "/v1/me/player/queue",
            query: { device_id: deviceId, uri },
        });
    }

    pause(options: DeviceOptions = {}): Promise<void> {
        return this._http.request<void>({
            method: "PUT",
            path: "/v1/me/player/pause",
            query: options,
        });
    }

    next(options: DeviceOptions = {}): Promise<void> {
        return this._http.request<void>({
            method: "POST",
            path: "/v1/me/player/next",
            query: options,
        });
    }

    previous(options: DeviceOptions = {}): Promise<void> {
        return this._http.request<void>({
            method: "POST",
            path: "/v1/me/player/previous",
            query: options,
        });
    }

    shuffle(state: boolean, options: DeviceOptions = {}): Promise<void> {
        return this._http.request<void>({
            method: "PUT",
            path: "/v1/me/player/shuffle",
            query: { state, ...options },
        });
    }

    repeat(state: RepeatState, options: DeviceOptions = {}): Promise<void> {
        return this._http.request<void>({
            method: "PUT",
            path: "/v1/me/player/repeat",
            query: { state, ...options },
        });
    }
}
