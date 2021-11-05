import CacheAlbum from "../../cache/cache_album";
import { Component } from "..";
import { cache, idKey } from "../../cache/cache_helpers";

export class Albums extends Component {
    @cache(idKey)
    get(id: string): Promise<CacheAlbum> {
        return this._api.albums
            .get(id, { market: "from_token" })
            .then(this.augment.album.bind(this.augment));
    }

    getAll(ids: string[]): Promise<CacheAlbum[]> {
        return this._api.albums
            .getAll(ids, { market: "from_token" })
            .then(this.augment.albums.bind(this.augment));
    }

    @cache(idKey)
    getTrackURIs(id: string): Promise<string[]> {
        return this.get(id).then((album) =>
            album.tracks.items.map((t) => t.uri)
        );
    }
}
