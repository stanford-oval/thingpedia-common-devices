import { BaseDevice, BaseEngine } from "thingpedia";
import { ExecEnvironment } from "thingtalk";

export type OnOff = "on" | "off";

export function isOnOff(x: any): x is OnOff {
    return x === "on" || x === "off";
}

// `genie-toolkit` Types
// ===========================================================================

/**
 * Specifies what backend the client needs to use to actually play.
 */
export type CustomPlayerSpec =
    | {
          type: "spotify";
          username?: string;
          accessToken?: string;
      }
    | {
          type: "url";
      }
    | {
          type: "custom";
          /**
           * Map a pair of OS (as returned by process.platform) and
           * CPU architecture (as returned by process.arch), separated by -,
           * to a URL to download the binary to play.
           *
           * Example:
           * ```
           * {
           *  "linux-x64": "http://example.com/downloads/linux-x86-64/my-player",
           *  "win-x64": "http://example.com/downloads/linux-x86-64/my-player.exe"
           * }
           */
          binary: Record<string, string>;
          /**
           * Arguments to call the player binary with.
           *
           * The arguments will be appended to the binary name.
           *
           * If present, the special argument `...` will be replaced with the list of URLs
           * to play. In that case, all URLs will be passed to the binary at once.
           *
           * Otherwise, if the special argument `{}` is present, it will be replaced with
           * one URL to play. In that case, if multiple URLs are present, it is expected
           * that the binary will terminate successfully after playing each one.
           */
          args: string[];
      };

export interface SpotifyDeviceState extends BaseDevice.DeviceState {
    id: string;
}

export interface Tokenizer {
    _parseWordNumber(word: string): number;
}

export interface LangPack {
    getTokenizer(): Tokenizer;
}

export interface AudioDevice {
    /**
     * Stop all playback.
     */
    stop(conversationId: string): void;

    /**
     * Pause all playback.
     */
    pause?(conversationId: string): void;

    /**
     * Resume playback.
     */
    resume?(conversationId: string): void;
}

export interface AudioController {
    requestAudio(
        device: BaseDevice,
        iface: AudioDevice | (() => Promise<void>),
        conversationId?: string
    ): Promise<void>;

    /**
     * Check if the custom player backend is available.
     *
     * This function will check whether the backend is supported, and will
     * attempt to initialize it using the given spec.
     *
     * The function is safe to call if the backend is unsupported, and will
     * return false.
     *
     * @param spec the player to check
     * @param conversationId the conversation ID associated with the current command;
     *      if specified, it will affect the choice of which player to play on
     * @returns
     */
    checkCustomPlayer(
        spec: CustomPlayerSpec,
        conversationId?: string
    ): Promise<boolean>;
}

export interface SpotifyDeviceEngine extends BaseEngine {
    langPack: LangPack;
    audio?: AudioController;
}

export type Params = Record<string, any>;

/**
 * @see https://github.com/stanford-oval/genie-toolkit/blob/dd3aa4d2ed78c94e0243b89d6e9c34d2fb1722cd/lib/engine/apps/exec_wrapper.ts#L218
 */
export type ExecWrapper = ExecEnvironment & {
    app: {
        uniqueId: string;
    };
    addExitProcedureHook(hook: () => void | Promise<void>): void;
    conversation?: string;
};
