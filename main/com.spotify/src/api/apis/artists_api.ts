import { assertMax } from "../../helpers";
import {
    ArtistObject,
    PagingObject,
    SimplifiedAlbumObject,
    TrackObject,
} from "../objects";
import BaseApi from "./base_api";

export default class ArtistsApi extends BaseApi {
    /**
     * Get a single artist by ID.
     *
     * @see https://developer.spotify.com/documentation/web-api/reference/#category-artists
     * @see https://developer.spotify.com/console/get-artist/
     *
     * @param id Artist ID.
     * @returns Artist object.
     */
    get(id: string): Promise<ArtistObject> {
        return this._http.get<ArtistObject>(`/v1/artists/${id}`);
    }

    /**
     * Get multiple artists by their IDs.
     *
     * @see https://developer.spotify.com/documentation/web-api/reference/#category-artists
     * @see https://developer.spotify.com/console/get-several-artists/
     *
     * @param ids Array of artist IDs. Limit 50. Not de-duped.
     * @returns Array of artist objects corresponding to the `ids`.
     */
    getAll(ids: string[]): Promise<ArtistObject[]> {
        assertMax("ids.length", ids.length, 50);
        if (ids.length === 0) {
            return Promise.resolve([]);
        }
        return this._http.getList<ArtistObject>("/v1/artists", { ids });
    }

    getAlbums(
        id: string,
        options: {
            include_groups?: Array<
                "album" | "single" | "appears_on" | "compilation"
            >;
            market?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<PagingObject<SimplifiedAlbumObject>> {
        return this._http.get<PagingObject<SimplifiedAlbumObject>>(
            `/v1/artists/${id}/albums`,
            options
        );
    }

    getTopTracks(
        id: string,
        options: { market?: string } = {}
    ): Promise<TrackObject[]> {
        return this._http.getList<TrackObject>(
            `/v1/artists/${id}/top-tracks`,
            options
        );
    }

    getRelatedArtists(id: string): Promise<ArtistObject[]> {
        return this._http.getList<ArtistObject>(
            `/v1/artists/${id}/related-artists`
        );
    }
}
