import CacheArtist from "../../cache/cache_artist";
import { arrayFor } from "../../helpers";
import { Component } from "..";
import { cache } from "../../cache/cache_helpers";

export class Follow extends Component {
    // TODO Should pull all the pages
    @cache(null)
    getMyArtists(
        options: {
            after?: string;
            limit?: number;
        } = {}
    ): Promise<CacheArtist[]> {
        return this._api.follow
            .getMyArtists()
            .then((page) => this.augment.artists(page.items));
    }

    // TODO Should break the `getMyArtists` cache
    putArtists(ids: string | string[]): Promise<void> {
        return this._api.follow.putArtists(arrayFor(ids));
    }
}
