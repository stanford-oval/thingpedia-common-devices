import CacheAlbum from "../../cache/cache_album";
import { cache } from "../../cache/cache_helpers";
import CacheShow from "../../cache/cache_show";
import CacheTrack from "../../cache/cache_track";
import { arrayFor } from "../../helpers";
import { Component } from "..";

export class Library extends Component {
    // TODO Get all pages
    @cache(null)
    getShows(): Promise<CacheShow[]> {
        return this._api.library
            .getShows({ limit: 50 })
            .then((r) =>
                this.augment.shows(r.items.map((entry) => entry.show))
            );
    }

    // TODO Get all pages
    @cache(null)
    getTracks(): Promise<CacheTrack[]> {
        return this._api.library
            .getTracks({ limit: 50 })
            .then((page) =>
                this.augment.tracks(page.items.map((x) => x.track))
            );
    }

    // TODO Get all pages
    @cache(null)
    getAlbums(): Promise<CacheAlbum[]> {
        return this._api.library
            .getAlbums({ limit: 50 })
            .then((page) =>
                this.augment.albums(page.items.map((x) => x.album))
            );
    }

    // TODO Break cache
    putAlbums(ids: string | string[]): Promise<void> {
        return this._api.library.putAlbums(arrayFor(ids));
    }

    // TODO Break cache
    putTracks(ids: string | string[]): Promise<void> {
        return this._api.library.putTracks(arrayFor(ids));
    }

    // TODO Break cache
    putShows(ids: string | string[]): Promise<void> {
        return this._api.library.putShows(arrayFor(ids));
    }

    // TODO Break cache
    putEpisodes(ids: string | string[]): Promise<void> {
        return this._api.library.putEpisodes(arrayFor(ids));
    }
}
