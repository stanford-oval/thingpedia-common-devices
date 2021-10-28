import { SearchKwds } from "../../api/apis/search_api";
import { SearchQuery } from "../../api/search_query";
import CacheAlbum from "../../cache/cache_album";
import CacheArtist from "../../cache/cache_artist";
import { orderedPairsFor } from "../../cache/cache_helpers";
import CachePlaylist from "../../cache/cache_playlist";
import CacheShow from "../../cache/cache_show";
import CacheTrack from "../../cache/cache_track";
import { Component } from "..";
import { cache } from "../../cache/cache_helpers";

export type CachePlayable = CacheTrack | CacheAlbum | CachePlaylist | CacheShow;

function makeCacheKey(kwds: Omit<SearchKwds, "type">): string {
    return JSON.stringify(
        orderedPairsFor({
            ...kwds,
            query: SearchQuery.from(kwds.query).toString(),
        })
    );
}

export class Search extends Component {
    @cache(makeCacheKey)
    async artists(kwds: Omit<SearchKwds, "type">): Promise<CacheArtist[]> {
        const response = await this._api.search.search({
            type: "artist",
            market: "from_token",
            ...kwds,
        });
        if (response.artists) {
            return await this.augment.artists(response.artists.items);
        }
        return [];
    }

    @cache(makeCacheKey)
    async albums(kwds: Omit<SearchKwds, "type">): Promise<CacheAlbum[]> {
        const response = await this._api.search.search({
            type: "album",
            market: "from_token",
            ...kwds,
        });
        if (response.albums) {
            return await this.augment.albums(response.albums.items);
        }
        return [];
    }

    @cache(makeCacheKey)
    async tracks(kwds: Omit<SearchKwds, "type">): Promise<CacheTrack[]> {
        const response = await this._api.search.search({
            type: "track",
            market: "from_token",
            ...kwds,
        });
        if (response.tracks) {
            return await this.augment.tracks(response.tracks.items);
        }
        return [];
    }

    @cache(makeCacheKey)
    async shows(kwds: Omit<SearchKwds, "type">): Promise<CacheShow[]> {
        const response = await this._api.search.search({
            type: "show",
            market: "from_token",
            ...kwds,
        });
        if (response.shows) {
            return await this.augment.shows(response.shows.items);
        }
        return [];
    }

    @cache(makeCacheKey)
    async playlists(kwds: Omit<SearchKwds, "type">): Promise<CachePlaylist[]> {
        const response = await this._api.search.search({
            type: "playlist",
            market: "from_token",
            ...kwds,
        });
        if (response.playlists) {
            return await this.augment.playlists(response.playlists.items);
        }
        return [];
    }

    @cache(makeCacheKey)
    async playables({
        query,
        market = "from_token",
        limit,
        offset,
        include_external,
    }: Omit<SearchKwds, "type">): Promise<CachePlayable[]> {
        const results = await this._api.search.search({
            query,
            type: "track,album,playlist,show",
            market,
            limit,
            offset,
        });

        const promises: Promise<CachePlayable[]>[] = [];

        if (results.tracks && results.tracks.total > 0) {
            promises.push(this.augment.tracks(results.tracks.items));
        }

        if (results.albums && results.albums.total > 0) {
            promises.push(this.augment.albums(results.albums.items));
        }

        if (results.playlists && results.playlists.total > 0) {
            promises.push(this.augment.playlists(results.playlists.items));
        }

        if (results.shows && results.shows.total > 0) {
            promises.push(this.augment.shows(results.shows.items));
        }

        const lists = await Promise.all(promises);

        const playables: CachePlayable[] = [];
        for (const list of lists) {
            for (const playable of list) {
                playables.push(playable);
            }
        }

        return playables;
    }
}
