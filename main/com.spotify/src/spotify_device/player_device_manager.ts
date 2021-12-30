import { strict as assert } from "assert";

import { BasePlatform } from "thingpedia";
import { Logger } from "@stanford-oval/logging";

import { DeviceObject } from "../api/objects";
import { Client } from "../client";
import { ExecWrapper, SpotifyDeviceEngine } from "./types";
import Logging from "../logging";
import { ThingError } from "../things";
import { errorMetaFor } from "../helpers";

const LOG = Logging.get(__filename);
const DESKTOP_APP_WAIT_MS = 20000; // 20 seconds
const DEFAULT_REFRESH_INTERVAL_MS = 10000; // 10 seconds

type MaybeDevice = undefined | DeviceObject;

export default class PlayerDeviceManager {
    private readonly _log : Logger.TLogger;

    protected readonly _client : Client;
    protected _currentDevice : MaybeDevice;
    protected _currentDeviceAge : number;
    protected _devicePromise ?: Promise<MaybeDevice>;
    protected readonly _engine : SpotifyDeviceEngine;
    protected _failedToLaunchDesktopApp  = false;
    protected readonly _hasAppLauncher : boolean;
    protected readonly _platform : BasePlatform;
    protected readonly _username : string;
    protected _refresher ?: NodeJS.Timeout;

    public accessToken ?: string;

    constructor({
        accessToken,
        client,
        engine,
        platform,
        username,
    } : {
        accessToken ?: string;
        client : Client;
        engine : SpotifyDeviceEngine;
        platform : BasePlatform;
        username : string;
    }) {
        this.accessToken = accessToken;
        this._client = client;
        this._engine = engine;
        this._platform = platform;
        this._username = username;

        this._log = LOG.childFor(PlayerDeviceManager, { username });
        this._log.level = "debug";

        this._hasAppLauncher = platform.hasCapability("app-launcher");

        this._currentDevice = undefined;
        this._currentDeviceAge = 0;
    }

    public async start() {
        await this._refresh();
    }

    public stop() {
    }

    public async get(env ?: ExecWrapper) : Promise<DeviceObject> {
        const now = Date.now();

        let device = this._currentDevice;

        if (device !== undefined && (now - this._currentDeviceAge) <= DEFAULT_REFRESH_INTERVAL_MS)
            return device;

        device = await this._refresh();

        if (device !== undefined)
            return device;

        device = await this._launch(env);

        if (device !== undefined)
            return device;

        throw new ThingError("No player devices", "no_active_device");
    }

    protected _refresh() : Promise<MaybeDevice> {
        const log = this._log.childFor(this._refresh);

        if (this._devicePromise === undefined) {
            log.debug("Device promise is undefined, initiating fetch...");
            this._devicePromise = this._update().then(
                (device) => {
                    this._devicePromise = undefined;
                    return device;
                },
                (reason) => {
                    this._devicePromise = undefined;
                    log.error(
                        "Unexpected error updating current device",
                        errorMetaFor(reason)
                    );
                    return undefined;
                }
            );
        }

        return this._devicePromise;
    }

    protected _selectDevice(devices : DeviceObject[]) : MaybeDevice {
        const log = this._log.childFor(this._selectDevice);

        if (devices.length === 0) {
            log.debug("No devices returned by Client, returning.");
            return undefined;
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
        }

        log.debug("Found active device, returning.", {
            device: activeDevice,
        });

        return activeDevice;
    }

    protected async _update() : Promise<MaybeDevice> {
        const log = this._log.childFor(this._update);

        log.debug("Fetching device list from Client...");

        let devices : DeviceObject[];
        try {
            devices = await this._client.player.getDevices();
        } catch(error) {
            const meta = error instanceof Error ? error : { error };
            log.error("Failed to get devices from Client", meta);
            this._currentDevice = undefined;
            this._currentDeviceAge = 0;
            return undefined;
        }

        const device = this._selectDevice(devices);

        log.debug("Setting current device", { device });
        this._currentDevice = device;
        this._currentDeviceAge = Date.now();

        return device;
    }

    protected _canLaunchDesktopApp() : boolean {
        const log = this._log.childFor(this._canLaunchDesktopApp);
        if (this._failedToLaunchDesktopApp) {
            log.debug("Unable to launch desktop app -- failed to in the past");
            return false;
        }
        if (this._hasAppLauncher) {
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

    protected async _launchDesktopApp() : Promise<MaybeDevice> {
        const log = this._log.childFor(this._launchDesktopApp);

        const appLauncher = this._platform.getCapability("app-launcher");

        assert(
            appLauncher !== null,
            "appLauncher is null -- did you call _canLaunchDesktopApp() first?"
        );

        log.debug("Launching Spotify desktop app...");
        await appLauncher.launchApp("com.spotify.Client.desktop");

        log.debug(
            `Async sleeping for ${DESKTOP_APP_WAIT_MS / 1000} seconds...`
        );
        await new Promise((resolve) => {
            setTimeout(resolve, DESKTOP_APP_WAIT_MS);
        });

        log.debug("Update device again...");
        const device = await this._update();

        if (device === undefined) {
            log.warn("Failed to launch Spotify desktop app, won't try again.");
            this._failedToLaunchDesktopApp = true;
        } else {
            log.debug("(Presumably) launched Spotify desktop app", { device });
        }

        return device;
    }

    protected async _launch(env ?: ExecWrapper) : Promise<MaybeDevice> {
        const log = this._log.childFor(this._launch);

        log.warn("No player devices available");

        if (this._canLaunchDesktopApp()) {
            const device = await this._launchDesktopApp();
            if (device !== undefined)
                return device;

        } else {
            log.debug("Can't launch Spotify desktop app");
        }

        // try initializing the player using the audio controller
        if (this._engine.audio && this._engine.audio.checkCustomPlayer) {
            log.debug(
                "Try initializing the player using the audio controller..."
            );
            const ok = await this._engine.audio.checkCustomPlayer(
                {
                    type: "spotify",
                    username: this._username,
                    accessToken: this.accessToken,
                },
                env?.conversation
            );

            if (ok) {
                log.debug("Audio controller initialized, updating device...");
                const device = await this._update();

                if (device === undefined) {
                    log.debug(
                        "Failed to update current device after " +
                            "audio controller initialization."
                    );
                } else {
                    log.debug(
                        "Updated current device after " +
                            "audio controller initialization.",
                        { device }
                    );
                }
            }
        } else {
            log.debug("Audio controller unavailable");
        }

        return undefined;
    }
}
