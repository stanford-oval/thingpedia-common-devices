import { assertMax, checkPageOptions } from "../../helpers";
import {
    PagingObject,
    ShowObject,
    SimplifiedEpisodeObject,
} from "../objects";
import { MarketPageOptions } from "../requests";
import BaseApi from "./base_api";

export default class ShowsApi extends BaseApi {
    getAll(
        ids: string[],
        options: { market?: string } = {}
    ): Promise<ShowObject[]> {
        assertMax("ids.length", ids.length, 50);
        return this._http.getList<ShowObject>("/v1/shows", {
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
