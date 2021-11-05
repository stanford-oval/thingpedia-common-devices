import { assertMax } from "../../helpers";
import { AudioFeaturesObject } from "../objects";
import BaseApi from "./base_api";

export default class TracksApi extends BaseApi {
    getAudioFeatures(trackIds: string[]): Promise<AudioFeaturesObject[]> {
        assertMax("trackIds.length", trackIds.length, 100);
        return this._http.getList<AudioFeaturesObject>("/v1/audio-features", {
            ids: trackIds,
        });
    }
}
