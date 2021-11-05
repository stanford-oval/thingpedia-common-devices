import { BrowseOptions } from "../../api/requests";
import CacheAlbum from "../../cache/cache_album";
import CachePlaylist from "../../cache/cache_playlist";
import { Component } from "..";
import { cache, orderedPairsFor } from "../../cache/cache_helpers";

/**
 * @todo This has issues... if `options.timestamp` is passed — representing the
 * _user's_ local time — this implementation will be pretty useless. Needs some
 * particular attention to get "right".
 *
 * @param options
 * @returns Arguments part of the cache key
 */
function argsKey(options?: BrowseOptions): undefined | string {
    if (options === undefined) {
        return undefined;
    }
    return JSON.stringify(orderedPairsFor(options));
}

export class Browse extends Component {
    @cache(argsKey)
    getFeaturedPlaylists(
        options: BrowseOptions = {}
    ): Promise<CachePlaylist[]> {
        return this._api.browse
            .getFeaturedPlaylists(options)
            .then((r) => this.augment.playlists(r.playlists.items));
    }

    @cache(argsKey)
    getNewReleases(options: BrowseOptions = {}): Promise<CacheAlbum[]> {
        return this._api.browse
            .getNewReleases(options)
            .then((r) => this.augment.albums(r.items));
    }
}
