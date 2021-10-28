import {
    AlbumObject,
    ArtistObject,
    EpisodeObject,
    isAlbumObject,
    SimplifiedAlbumObject,
    SimplifiedPlaylistObject,
    SimplifiedShowObject,
    TrackObject,
} from "../api/objects";
import CacheAlbum from "../cache/cache_album";
import CacheArtist from "../cache/cache_artist";
import CacheEpisode from "../cache/cache_episode";
import CachePlaylist from "../cache/cache_playlist";
import CacheShow from "../cache/cache_show";
import CacheTrack from "../cache/cache_track";
import { Component } from ".";

export class Augment extends Component {
    async album(album: SimplifiedAlbumObject): Promise<CacheAlbum> {
        if (isAlbumObject(album)) {
            return new CacheAlbum(album);
        }
        return new CacheAlbum(await this._api.albums.get(album.id));
    }

    async albums(albums: SimplifiedAlbumObject[]): Promise<CacheAlbum[]> {
        const albumObjects: Record<string, AlbumObject> = {};
        const idsToGet: string[] = [];
        for (const album of albums) {
            if (isAlbumObject(album)) {
                albumObjects[album.id] = album;
            } else {
                idsToGet.push(album.id);
            }
        }
        if (idsToGet.length > 0) {
            for (const album of await this._api.albums.getAll(idsToGet)) {
                albumObjects[album.id] = album;
            }
        }
        return albums.map((album) => new CacheAlbum(albumObjects[album.id]));
    }

    async artists(artists: ArtistObject[]): Promise<CacheArtist[]> {
        return artists.map((a) => new CacheArtist(a));
    }

    async artist(artist: ArtistObject): Promise<CacheArtist> {
        return new CacheArtist(artist);
    }

    async tracks(tracks: TrackObject[]): Promise<CacheTrack[]> {
        const trackIds: string[] = [];
        const artistIds: Set<string> = new Set();
        for (let track of tracks) {
            trackIds.push(track.id);
            for (let artist of track.artists) {
                artistIds.add(artist.id);
            }
        }

        const audioFeaturesPromise =
            this._api.tracks.getAudioFeatures(trackIds);
        const artistsPromise = this._client.artists.getAll(
            Array.from(artistIds)
        );

        const [audioFeatures, artists] = await Promise.all([
            audioFeaturesPromise,
            artistsPromise,
        ]);

        const artistsById: Record<string, ArtistObject> = {};
        for (let artist of artists) {
            artistsById[artist.id] = artist;
        }

        const cacheTracks: CacheTrack[] = [];

        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];

            const trackArtists: ArtistObject[] = [];
            for (let simplifiedArtist of track.artists) {
                if (artistsById.hasOwnProperty(simplifiedArtist.id)) {
                    trackArtists.push(artistsById[simplifiedArtist.id]);
                }
            }

            cacheTracks.push(
                CacheTrack.from(track, trackArtists, audioFeatures[i])
            );
        }

        return cacheTracks;
    }

    async track(track: TrackObject): Promise<CacheTrack> {
        return (await this.tracks([track]))[0];
    }

    async playlists(
        playlists: SimplifiedPlaylistObject[]
    ): Promise<CachePlaylist[]> {
        return playlists.map((p) => new CachePlaylist(p));
    }

    async playlist(playlist: SimplifiedPlaylistObject): Promise<CachePlaylist> {
        return new CachePlaylist(playlist);
    }

    async shows(shows: SimplifiedShowObject[]): Promise<CacheShow[]> {
        return shows.map((s) => new CacheShow(s));
    }

    async episodes(episodes: EpisodeObject[]): Promise<CacheEpisode[]> {
        return episodes.map((e) => new CacheEpisode(e));
    }

    async episode(episode: EpisodeObject): Promise<CacheEpisode> {
        return (await this.episodes([episode]))[0];
    }
}
