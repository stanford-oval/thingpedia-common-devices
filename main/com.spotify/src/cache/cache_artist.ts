import { ArtistObject, FollowersObject, ImageObject } from "../api/objects";
import { ThingArtist } from "../things";
import CacheEntity, { DisplayFormatter } from "./cache_entity";
import { cacheRegister } from "./cache_helpers";

class CacheArtist extends CacheEntity implements ArtistObject {
    // Properties
    // =======================================================================

    // AlbumObject Properties
    // -----------------------------------------------------------------------
    type: "artist";
    external_urls: object;
    href: string;
    followers: FollowersObject;
    genres: string[];
    images: ImageObject[];
    popularity: number; // int[0, 100]

    // Construction
    // =======================================================================

    constructor(artist: ArtistObject) {
        super(artist.type, artist.id, artist.name, artist.uri);
        this.type = artist.type;
        this.external_urls = artist.external_urls;
        this.href = artist.href;
        this.followers = artist.followers;
        this.genres = artist.genres;
        this.images = artist.images;
        this.popularity = artist.popularity;
    }

    toThing(formatter: DisplayFormatter): ThingArtist {
        return {
            id: this.entity(formatter),
            genres: this.genres,
            popularity: this.popularity,
        };
    }
}

cacheRegister(CacheArtist);
export default CacheArtist;
