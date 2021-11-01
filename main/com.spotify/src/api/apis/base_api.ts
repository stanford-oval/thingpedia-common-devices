import Http from "../http";

export default class BaseApi {
    protected _http: Http;

    constructor(http: Http) {
        this._http = http;
    }
}
