import { assertMax, checkPageOptions } from "../../helpers";
import {
    PagingObject,
    SimplifiedEpisodeObject,
    SimplifiedShowObject,
} from "../objects";
import { MarketPageOptions } from "../requests";
import BaseApi from "./base_api";

export default class ShowsApi extends BaseApi {
    getAll(
        ids: string[],
        options: { market?: string } = {}
    ): Promise<SimplifiedShowObject[]> {
        assertMax("ids.length", ids.length, 50);
        return this._http.getList<SimplifiedShowObject>("/v1/shows", {
            ids,
            ...options,
        });
    }

    getEpisodes(
        id: string,
        options: MarketPageOptions = {}
    ): Promise<PagingObject<SimplifiedEpisodeObject>> {
        checkPageOptions(options);
        return this._http.get<PagingObject<SimplifiedEpisodeObject>>(
            `/v1/shows/${id}/episodes`,
            options
        );
    }
}
