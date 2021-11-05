import CacheArtist from "../../cache/cache_artist";
import CacheTrack from "../../cache/cache_track";
import { Component } from "..";
import { cache, idKey } from "../../cache/cache_helpers";

export class Artists extends Component {
    getAll(ids: string[]): Promise<CacheArtist[]> {
        if (ids.length === 0) {
            return Promise.resolve([]);
        }
        if (ids.length === 1) {
            return this.get(ids[0]).then((x) => [x]);
        }

        // chunk the request into multiple chunks of at
        // most 50 artists (the API will complain otherwise)

        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 50) {
            chunks.push(ids.slice(i, i + 50));
        }

        return Promise.all(
            chunks.map((chunk) => {
                return this._api.artists
                    .getAll(chunk)
                    .then(this.augment.artists.bind(this.augment));
            })
        ).then((res) => res.flat());
    }

    @cache(idKey)
    get(id: string): Promise<CacheArtist> {
        return this._api.artists
            .get(id)
            .then(this.augment.artist.bind(this.augment));
    }

    @cache(idKey)
    getTopTracks(id: string): Promise<CacheTrack[]> {
        return this._api.artists
            .getTopTracks(id, { market: "from_token" })
            .then(this.augment.tracks.bind(this.augment));
    }

    @cache(idKey)
    getTopTrackURIs(id: string): Promise<string[]> {
        // TODO This can potentially be done more efficiently
        return this.getTopTracks(id).then((tracks) => tracks.map((t) => t.uri));
    }
}
