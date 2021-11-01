import { strict as assert } from "assert";

import { AlbumObject } from "../objects";
import BaseApi from "./base_api";

export default class AlbumsApi extends BaseApi {
    get(id: string, options: { market?: string } = {}): Promise<AlbumObject> {
        return this._http.get<AlbumObject>(`/v1/albums/${id}`, options);
    }

    getAll(
        ids: string[],
        options: { market?: string } = {}
    ): Promise<AlbumObject[]> {
        assert(ids.length <= 20, `Limit 20 ids, given ${ids.length}.`);
        return this._http.getList<AlbumObject>("/v1/albums", {
            ids,
            ...options,
        });
    }
}
