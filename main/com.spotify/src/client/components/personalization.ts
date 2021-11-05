import { MyTopOptions } from "../../api/requests";
import CacheArtist from "../../cache/cache_artist";
import { cache, orderedPairsFor } from "../../cache/cache_helpers";
import CacheTrack from "../../cache/cache_track";
import { Component } from "..";

function argsKey(options?: MyTopOptions): undefined | string {
    if (options === undefined) {
        return undefined;
    }
    return JSON.stringify(orderedPairsFor(options));
}

export class Personalization extends Component {
    @cache(argsKey)
    getMyTopArtists(options?: MyTopOptions): Promise<CacheArtist[]> {
        return this._api.personalization
            .getMyTopArtists(options)
            .then((r) => this.augment.artists(r.items));
    }

    @cache(argsKey)
    getMyTopTracks(options?: MyTopOptions): Promise<CacheTrack[]> {
        return this._api.personalization
            .getMyTopTracks(options)
            .then((r) => this.augment.tracks(r.items));
    }
}
