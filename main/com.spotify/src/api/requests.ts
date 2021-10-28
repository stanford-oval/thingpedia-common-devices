export type TimeRange = "long_term" | "medium_term" | "short_term";

export interface PageOptions {
    limit?: number;
    offset?: number;
}

export interface MarketPageOptions extends PageOptions {
    market?: string;
}

export interface BrowseOptions extends PageOptions {
    country?: string;
    locale?: string;
    timestamp?: string | Date;
}

export interface MyTopOptions extends PageOptions {
    time_range?: TimeRange;
}

export interface DeviceOptions {
    device_id?: string;
}

export type RepeatState = "track" | "context" | "off";

export function isRepeatState(x: any): x is RepeatState {
    return x === "track" || x === "context" || x === "off";
}

export interface PlaylistCreateOptions {
    public?: boolean;
    collaborative?: boolean;
    description?: string;
}

export interface PlaylistAddOptions {
    position?: number;
}
