import {
    AlbumObject,
    ArtistObject,
    PagingObject,
    ShowObject,
    SimplifiedAlbumObject,
    SimplifiedEpisodeObject,
    SimplifiedPlaylistObject,
    SimplifiedShowObject,
    TrackObject,
} from "./objects";

export interface SearchResponse {
    albums?: PagingObject<SimplifiedAlbumObject>;
    artists?: PagingObject<ArtistObject>;
    episodes?: PagingObject<SimplifiedEpisodeObject>;
    playlists?: PagingObject<SimplifiedPlaylistObject>;
    shows?: PagingObject<SimplifiedShowObject>;
    tracks?: PagingObject<TrackObject>;
}

export interface FeaturedPlaylistsResponse {
    message: string;
    playlists: PagingObject<SimplifiedPlaylistObject>;
}

export interface UserSavedAlbum {
    added_at: string;
    album: AlbumObject;
}

export interface UserSavedShow {
    added_at: string;
    show: ShowObject;
}

export interface UserSavedTrack {
    added_at: string;
    track: TrackObject;
}

export interface PlaylistSnapshotResponse {
    snapshot_id: string;
}
