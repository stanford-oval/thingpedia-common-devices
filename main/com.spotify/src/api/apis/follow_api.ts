import { ArtistObject, PagingObject } from "../objects";
import BaseApi from "./base_api";

export default class FollowApi extends BaseApi {
    getMyArtists(
        options: {
            after?: string;
            limit?: number;
        } = {}
    ): Promise<PagingObject<ArtistObject>> {
        return this._http
            .get<{ artists: PagingObject<ArtistObject> }>(
                "/v1/me/following",
                options
            )
            .then(({ artists }) => artists);
    }

    putArtists(ids: string[]): Promise<void> {
        return this._http.request<void>({
            method: "PUT",
            path: "/v1/me/following",
            query: { type: "artist" },
            body: { ids },
        });
    }
}
