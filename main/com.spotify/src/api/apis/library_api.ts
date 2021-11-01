import { PagingObject } from "../objects";
import { PageOptions } from "../requests";
import { UserSavedAlbum, UserSavedShow, UserSavedTrack } from "../responses";
import BaseApi from "./base_api";

export default class LibraryApi extends BaseApi {
    getShows(options: PageOptions = {}): Promise<PagingObject<UserSavedShow>> {
        return this._http.get<PagingObject<UserSavedShow>>(
            "/v1/me/shows",
            options
        );
    }

    getTracks(
        options: PageOptions = {}
    ): Promise<PagingObject<UserSavedTrack>> {
        return this._http.get<PagingObject<UserSavedTrack>>(
            "/v1/me/tracks",
            options
        );
    }

    getAlbums(
        options: PageOptions = {}
    ): Promise<PagingObject<UserSavedAlbum>> {
        return this._http.get<PagingObject<UserSavedAlbum>>(
            "/v1/me/albums",
            options
        );
    }

    putAlbums(ids: string[]): Promise<void> {
        return this._http.put<void>("/v1/me/albums", { ids });
    }

    putTracks(ids: string[]): Promise<void> {
        return this._http.put<void>("/v1/me/tracks", { ids });
    }

    putShows(ids: string[]): Promise<void> {
        return this._http.request<void>({
            method: "PUT",
            path: "/v1/me/shows",
            query: { ids },
        });
    }

    putEpisodes(ids: string[]): Promise<void> {
        return this._http.put<void>("/v1/me/episodes", { ids });
    }
}
