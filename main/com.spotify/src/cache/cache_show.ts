import {
    ExternalUrlObject,
    ImageObject,
    ShowObject,
    CopyrightObject,
} from "../api/objects";
import { ThingShow } from "../things";
import CacheEntity, { DisplayFormatter } from "./cache_entity";
import { cacheRegister } from "./cache_helpers";

class CacheShow extends CacheEntity implements ShowObject {
    // Properties
    // =======================================================================

    // ShowObject Properties
    // -----------------------------------------------------------------------
    available_markets: string[];
    copyrights: CopyrightObject[];
    description: string;
    explicit?: boolean;
    external_urls: ExternalUrlObject;
    href: string;
    html_description: string;
    images: ImageObject[];
    is_externally_hosted: boolean;
    languages: string[];
    media_type: string;
    publisher: string;

    // Construction
    // =======================================================================

    constructor(show: ShowObject) {
        super(show.type, show.id, show.name, show.uri);
        this.available_markets = show.available_markets;
        this.copyrights = show.copyrights;
        this.description = show.description;
        this.explicit = show.explicit;
        this.external_urls = show.external_urls;
        this.href = show.href;
        this.html_description = show.html_description;
        this.images = show.images;
        this.is_externally_hosted = show.is_externally_hosted;
        this.languages = show.languages;
        this.media_type = show.media_type;
        this.publisher = show.publisher;
    }

    toThing(formatter: DisplayFormatter): ThingShow {
        return {
            id: this.entity(formatter),
            publisher: this.publisher,
        };
    }
}

cacheRegister(CacheShow);
export default CacheShow;
