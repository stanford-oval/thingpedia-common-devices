// Independent Types
// ===========================================================================
//
// That don't reference other API object types.
//

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-albumrestrictionobject
 */
export interface AlbumRestrictionObject {
    reason: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-trackrestrictionobject
 */
export interface TrackRestrictionObject {
    reason: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-episoderestrictionobject
 */
export interface EpisodeRestrictionObject {
    reason: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-externalurlobject
 */
export interface ExternalUrlObject {
    spotify: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-followersobject
 */
export interface FollowersObject {
    href: null | string;
    total: number; // int
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-imageobject
 */
export interface ImageObject {
    height: number; // int
    url: string;
    width: number; // int
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-audiofeaturesobject
 */
export interface AudioFeaturesObject {
    acousticness: number; // float [0, 1]
    analysis_url: string;
    danceability: number; // float [0, 1]
    duration_ms: number; // int
    energy: number; // float [0, 1]
    // id: string; // Track ID
    instrumentalness: number; // float [0, 1]
    key: number; // int [0, 11] https://en.wikipedia.org/wiki/Pitch_class
    liveness: number; // float [0, 1]
    loudness: number; // float [0, 1]
    mode: number; // int [0, 1]? "Major is represented by 1 and minor is 0."
    speechiness: number; // float [0, 1]
    tempo: number; // float
    time_signature: number; // int "how many beats are in each bar (measure)"
    // track_href: string; // web location?
    // type: string; = "audio_features"
    valence: number; // float [0, 1] How "positive" the track is
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-externalidobject
 */
export interface ExternalIdObject {
    // http://en.wikipedia.org/wiki/International_Article_Number_%28EAN%29
    ean?: string;
    // http://en.wikipedia.org/wiki/International_Standard_Recording_Code
    isrc?: string;
    // http://en.wikipedia.org/wiki/Universal_Product_Code
    upc?: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-copyrightobject
 */
export interface CopyrightObject {
    text: string;
    type: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-cursorobject
 */
export interface CursorObject {
    after: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-playlisttracksrefobject
 */
export interface PlaylistTracksRefObject {
    href: string;
    total: number; // int
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-resumepointobject
 */
export interface ResumePointObject {
    fully_played: boolean;
    resume_position_ms: number; // int
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-deviceobject
 */
export interface DeviceObject {
    id: string;
    is_active: boolean;
    is_private_session: boolean;
    is_restricted: boolean;
    name: string;
    type: string; // such as “[cC]omputer”, “smartphone” or “speaker” ???
    volume_percent: number; // int[0, 100]
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-disallowsobject
 */
export interface DisallowsObject {
    interrupting_playback?: boolean;
    pausing?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
    toggling_repeat_context?: boolean;
    toggling_repeat_track?: boolean;
    toggling_shuffle?: boolean;
    transferring_playback?: boolean;
}

export interface ContextObject {
    external_urls: ExternalUrlObject;
    href: string;
    type: string; // "playlist", etc.
    uri: string;
}

export interface PagingObject<TItem> {
    href: string;
    items: TItem[];
    limit: number; // int
    next: null | string;
    // Not documented
    offset: number; // int
    // Not documented
    previous: null | string;
    total: number; // int
}

export function isPagingObject(x: any): x is PagingObject<unknown> {
    return (
        typeof x === "object" &&
        x !== undefined &&
        x !== null &&
        x.hasOwnProperty("total") &&
        typeof x.total === "number" &&
        x.hasOwnProperty("items") &&
        Array.isArray(x.items)
    );
}

export function isPagingObjectOf<TItem>(
    x: any,
    isItem: (item: any) => item is TItem
): x is PagingObject<TItem> {
    return isPagingObject(x) && x.items.every(isItem);
}

// Custom Bases
// ===========================================================================
//
// Where we add structure that the API docs don't include.
//

/**
 * Custom base for what we understand as an API object that can be represented
 * with a `thingpedia.Value.Entity` instance.
 *
 * We use `name` and `uri` to form the `thingpedia.Value.Entity`, but `type` and
 * `id` are also universally present on these objects (note that `uri` seems
 * to be composed of `type` and `id`).
 */
export interface EntityObject {
    type: string;
    id: string;
    name: string;
    uri: string;
}

export function isEntityObject(x: any): x is EntityObject {
    return (
        typeof x === "object" &&
        x !== null &&
        ["type", "id", "name", "uri"].every(
            (prop) => x.hasOwnProperty(prop) && typeof x[prop] === "string"
        )
    );
}

// Dependent Types
// ===========================================================================
//
// That reference other API object types.
//

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-cursorpagingobject
 */
export interface CursorPagingObject<TItem> extends PagingObject<TItem> {
    cursors: CursorObject;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-publicuserobject
 */
export interface PublicUserObject {
    display_name: null | string;
    external_urls: ExternalUrlObject;
    followers: FollowersObject;
    href: string;
    id: string;
    images: ImageObject[];
    type: string;
    uri: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-linkedtrackobject
 */
export interface LinkedTrackObject {
    external_urls: ExternalUrlObject;
    href: string;
    id: string;
    type: string;
    uri: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-simplifiedartistobject
 */
export interface SimplifiedArtistObject extends EntityObject {
    type: "artist";
    external_urls: object;
    href: string;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-artistobject
 */
export interface ArtistObject extends SimplifiedArtistObject {
    followers: FollowersObject;
    genres: string[];
    images: ImageObject[];
    popularity: number; // int[0, 100]
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-albumbase
 */
export interface SimplifiedAlbumObject extends EntityObject {
    type: "album";
    album_type: string;
    artists: SimplifiedArtistObject[];
    available_markets: string[];
    external_urls: ExternalUrlObject;
    href: string;
    images: ImageObject[];
    release_date: string;
    release_date_precision: string;
    restrictions?: AlbumRestrictionObject;
    total_tracks: number; // int
}

export function isSimplifiedAlbumObject(x: any): x is SimplifiedAlbumObject {
    return isEntityObject(x) && x.type === "album";
}

/**
 * Not documented?!?
 */
export interface AlbumObject extends SimplifiedAlbumObject {
    copyrights: CopyrightObject[];
    external_ids: ExternalIdObject;
    // Seems to always be empty..?
    genres: string[];
    label: string;
    popularity: number; // int[0, 100]
    tracks: PagingObject<SimplifiedTrackObject>;
}

export function isAlbumObject(x: any): x is AlbumObject {
    return (
        isSimplifiedAlbumObject(x) &&
        x.hasOwnProperty("tracks") &&
        x.hasOwnProperty("popularity")
    );
}

export /**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-simplifiedtrackobject
 */
interface SimplifiedTrackObject extends EntityObject {
    type: "track";
    // NOTE Docs say `artists` is `ArtistObject[]`, but it seems to be
    //      `SimplifiedArtistObject[]` in responses.
    artists: SimplifiedArtistObject[];
    available_markets: string[];
    disc_number: number; // int
    duration_ms: number; // int
    explicit?: boolean; // may be unknown
    external_urls: ExternalUrlObject;
    href: string;
    is_local: boolean;
    is_playable?: boolean; // relinking (when given market)
    linked_from?: LinkedTrackObject; // relinking (when given market)
    preview_url: string;
    restrictions?: TrackRestrictionObject;
    track_number: number; // int, inside disc_number
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-trackobject
 */
export interface TrackObject extends SimplifiedTrackObject {
    album: SimplifiedAlbumObject;
    external_ids: ExternalIdObject;
    popularity: number; // int[0, 100]
}

export interface SimplifiedEpisodeObject extends EntityObject {
    type: "episode";
    audio_preview_url: null | string;
    description: string;
    duration_ms: number; // int
    explicit?: boolean;
    external_urls: ExternalUrlObject;
    href: string;
    html_description: string;
    images: ImageObject[];
    is_externally_hosted: boolean;
    is_playable: boolean;
    language?: string; // deprecated
    languages: string[];
    release_date: string;
    release_date_precision: string;
    restrictions: EpisodeRestrictionObject;
    // Present when token has `user-read-playback-position` perm
    resume_point?: ResumePointObject;
}

export interface EpisodeObject extends SimplifiedEpisodeObject {}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-simplifiedplaylistobject
 */
export interface SimplifiedPlaylistObject extends EntityObject {
    type: "playlist";
    collaborative: boolean;
    description: null | string;
    external_urls: ExternalUrlObject;
    href: string;
    images: ImageObject[];
    owner: PublicUserObject;
    public: null | boolean;
    snapshot_id: string;
    tracks: PlaylistTracksRefObject;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-playlisttrackobject
 */
export interface PlaylistTrackObject {
    added_at: string; // Looks like ISO 8601 date..?
    added_by: PublicUserObject;
    is_local: boolean;
    track: TrackObject | EpisodeObject;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-playlistobject
 */
export interface PlaylistObject extends SimplifiedPlaylistObject {
    followers: FollowersObject;
    tracks: PagingObject<PlaylistTrackObject>;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-showbase
 */
export interface SimplifiedShowObject extends EntityObject {
    available_markets: string[];
    copyrights: CopyrightObject[];
    description: string;
    explicit?: boolean;
    external_urls: ExternalUrlObject;
    href: string;
    html_description: string;
    images: ImageObject[];
    is_externally_hosted: boolean;
    languages: string[];
    media_type: string;
    publisher: string;
}

export interface ShowObject extends SimplifiedShowObject {}

export interface CurrentlyPlayingObject {
    context: null | ContextObject;
    currently_playing_type: "track" | "episode" | "ad" | "unknown";
    is_playing: boolean;
    item: null | TrackObject | EpisodeObject;
    progress_ms: number;
    /** Unix Millisecond Timestamp when data was fetched. */
    timestamp: number;
}

/**
 * @see https://developer.spotify.com/documentation/web-api/reference/#object-currentlyplayingcontextobject
 */
export interface CurrentlyPlayingContextObject extends CurrentlyPlayingObject {
    actions: {
        disallows: DisallowsObject;
    };
    device: DeviceObject;
    repeat_state: "off" | "track" | "context";
    shuffle_state: boolean;
}

export interface UserObject {
    type: "user";
    country?: string;
    display_name: null | string;
    email?: string;
    explicit_content?: {
        filter_enabled: boolean;
        filter_locked: boolean;
    };
    external_urls: ExternalUrlObject;
    followers: FollowersObject;
    href: string;
    id: string;
    images: ImageObject[];
    product?: string;
    uri: string;
}
