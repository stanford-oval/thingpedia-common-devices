import { SearchQuery, SearchQueryProps } from "../search_query";
import { SearchResponse } from "../responses";
import BaseApi from "./base_api";

export type SearchKwds = {
    query: SearchQueryProps | SearchQuery;
    type: string | string[];
    market?: string;
    limit?: number;
    offset?: number;
    include_external?: string;
};

export default class SearchApi extends BaseApi {
    search(kwds: SearchKwds): Promise<SearchResponse> {
        const query = SearchQuery.from(kwds.query).toString();
        return this._http.get<SearchResponse>("/v1/search", {
            ...kwds,
            query,
        });
    }
}
