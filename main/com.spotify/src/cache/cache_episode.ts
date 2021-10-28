import {
    ExternalUrlObject,
    ImageObject,
    EpisodeObject,
    EpisodeRestrictionObject,
    ResumePointObject,
} from "../api/objects";
import { ThingEpisode } from "../things";
import CacheEntity, { DisplayFormatter } from "./cache_entity";
import { cacheRegister } from "./cache_helpers";

class CacheEpisode extends CacheEntity implements EpisodeObject {
    // Properties
    // =======================================================================

    // EpisodeObject Properties
    // -----------------------------------------------------------------------
    type: "episode";
    audio_preview_url: null | string;
    description: string;
    duration_ms: number; // int
    explicit?: boolean;
    external_urls: ExternalUrlObject;
    href: string;
    html_description: string;
    images: ImageObject[];
    is_externally_hosted: boolean;
    is_playable: boolean;
    language?: string; // deprecated
    languages: string[];
    release_date: string;
    release_date_precision: string;
    restrictions: EpisodeRestrictionObject;
    resume_point?: ResumePointObject;

    // Construction
    // =======================================================================

    constructor(episode: EpisodeObject) {
        super(episode.type, episode.id, episode.name, episode.uri);
        this.type = episode.type;
        this.audio_preview_url = episode.audio_preview_url;
        this.description = episode.description;
        this.duration_ms = episode.duration_ms;
        this.explicit = episode.explicit;
        this.external_urls = episode.external_urls;
        this.href = episode.href;
        this.html_description = episode.html_description;
        this.images = episode.images;
        this.is_externally_hosted = episode.is_externally_hosted;
        this.is_playable = episode.is_playable;
        this.language = episode.language; // deprecated
        this.languages = episode.languages;
        this.release_date = episode.release_date;
        this.release_date_precision = episode.release_date_precision;
        this.restrictions = episode.restrictions;
        this.resume_point = episode.resume_point;
    }

    toThing(formatter: DisplayFormatter): ThingEpisode {
        return {
            id: this.entity(formatter),
        };
    }
}

cacheRegister(CacheEpisode);
export default CacheEpisode;
