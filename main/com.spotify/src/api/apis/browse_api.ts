import { PagingObject, SimplifiedAlbumObject } from "../objects";
import { BrowseOptions } from "../requests";
import { FeaturedPlaylistsResponse } from "../responses";
import BaseApi from "./base_api";

// TODO The naive encoding of any `options.timestamp` passed as a `Date` will be
//      wrong — it is meant to represent the _user's_ local time, and as such
//      should _not_ have any timezone information attached — but
//      `JSON.stringify` will add the timezone info as it stands.
export default class BrowseApi extends BaseApi {
    getFeaturedPlaylists(
        options?: BrowseOptions
    ): Promise<FeaturedPlaylistsResponse> {
        return this._http.get<FeaturedPlaylistsResponse>(
            "/v1/browse/featured-playlists",
            options
        );
    }

    getNewReleases(
        options?: BrowseOptions
    ): Promise<PagingObject<SimplifiedAlbumObject>> {
        return this._http
            .get<{ albums: PagingObject<SimplifiedAlbumObject> }>(
                "/v1/browse/new-releases",
                options
            )
            .then((r) => r.albums);
    }
}
