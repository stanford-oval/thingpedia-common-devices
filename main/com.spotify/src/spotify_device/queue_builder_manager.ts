import QueueBuilder, { URIResolver } from "./queue_builder";
import Logging from "../logging";
import { ExecWrapper } from "./types";
import { DeviceObject } from "../api/objects";

const LOG = Logging.get(__filename);

export type ActiveDeviceResolver = (env: ExecWrapper) => Promise<DeviceObject>;
export type PlayCallback = (kwds: {
    uris: string | string[];
    device_id?: string;
}) => Promise<void>;
export type AddToQueueCallback = (
    device_id: string,
    uri: string
) => Promise<void>;

export default class QueueBuilderManager {
    private static readonly LOG = LOG.childFor(QueueBuilderManager);

    protected _resolveURI: URIResolver;
    protected _getActiveDevice: ActiveDeviceResolver;
    protected _play: PlayCallback;
    protected _addToQueue: AddToQueueCallback;
    protected _pendingBuilders: Map<string, QueueBuilder>;
    protected _backgroundBuilders: Map<string, QueueBuilder>;

    constructor({
        resolveURI,
        getActiveDevice,
        play,
        addToQueue,
    }: {
        resolveURI: URIResolver;
        getActiveDevice: ActiveDeviceResolver;
        play: PlayCallback;
        addToQueue: AddToQueueCallback;
    }) {
        this._resolveURI = resolveURI;
        this._getActiveDevice = getActiveDevice;
        this._play = play;
        this._addToQueue = addToQueue;
        this._pendingBuilders = new Map<string, QueueBuilder>();
        this._backgroundBuilders = new Map<string, QueueBuilder>();
    }

    get log() {
        return QueueBuilderManager.LOG;
    }

    async get(env: ExecWrapper): Promise<QueueBuilder> {
        const appId = env.app.uniqueId;
        // const log = LOG.childFor(this.get, { appId });
        let builder = this._pendingBuilders.get(appId);
        if (builder !== undefined) {
            return builder;
        }
        const device = await this._getActiveDevice(env);
        builder = new QueueBuilder(appId, device, this._resolveURI);
        env.addExitProcedureHook(() => this._flush(appId));
        this._pendingBuilders.set(appId, builder);
        return builder;
    }

    protected _backgroundProtect(promise: Promise<unknown>): void {
        promise.catch((reason: any) => {
            const log = this.log.childFor(this._backgroundProtect);
            if (reason instanceof Error) {
                log.error("Background process rejected", reason);
            } else {
                log.error("Background process rejected", { reason });
            }
        });
    }

    protected async _flush(appId: string): Promise<void> {
        const log = this.log.childFor(this._flush, { appId });

        log.debug("Flushing QueueBuilder...");

        const builder = this._pendingBuilders.get(appId);

        if (builder === undefined) {
            log.warn("No QueueBuilder found for appId");
            return;
        }

        this._pendingBuilders.delete(appId);

        if (builder.isEmpty) {
            log.error("Attempted to flush empty QueueBuilder.");
            return;
        }

        if (builder.srcURIs.length === 1) {
            log.debug(
                "QueueBuilder has a single URI, playing directly " +
                    "(async background)."
            );
            this._backgroundProtect(
                this._play({
                    device_id: builder.device.id,
                    uris: builder.srcURIs[0],
                })
            );
            return;
        }

        const uris = await builder.popInitialURIs();

        const backgroundBuilder = this._backgroundBuilders.get(appId);
        if (backgroundBuilder !== undefined) {
            log.debug(
                "A previous QueueBuilder is still flushing, canceling..."
            );
            backgroundBuilder.cancel();
            this._backgroundBuilders.delete(appId);
        }

        log.debug("Requesting playing initial URIs (async background)...", {
            uris,
        });
        this._backgroundProtect(
            this._play({
                device_id: builder.device.id,
                uris,
            }).then(() => {
                log.debug("Kicking off background flush...");
                return this._backgroundFlush(builder);
            })
        );
    }

    protected async _backgroundFlush(builder: QueueBuilder) {
        const log = this.log.childFor(this._backgroundFlush, {
            appId: builder.appId,
        });

        log.debug("Starting background flush...", { appId: builder.appId });

        this._backgroundBuilders.set(builder.appId, builder);

        for await (const uri of builder) {
            log.debug("Adding URI to queue...", { uri });
            this._addToQueue(builder.device.id, uri);
        }

        log.debug("Background flush done.");
        const other = this._backgroundBuilders.get(builder.appId);
        if (other === builder) {
            log.debug("Removing from background flush map");
            this._backgroundBuilders.delete(builder.appId);
        }
    }
}
